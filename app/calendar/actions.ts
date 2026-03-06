'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createCalendarBlock(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const title = formData.get('title') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const note = formData.get('note') as string
    const targetUserId = (formData.get('target_user_id') as string) || user.id

    if (!title || !startTime || !endTime) {
        return { error: 'Missing required fields' }
    }

    const { error, data } = await supabase
        .from('calendar_blocks')
        .insert({
            user_id: targetUserId,
            title,
            start_time: startTime,
            end_time: endTime,
            note: note || null
        })
        .select()

    if (error) {
        console.error('Error creating calendar block:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/calendar')
    return { success: true, data }
}

export async function updateCalendarBlock(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const id = formData.get('id') as string
    const title = formData.get('title') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const note = formData.get('note') as string

    if (!id || !title || !startTime || !endTime) {
        return { error: 'Missing required fields' }
    }

    // RLS on calendar_blocks enforces that only the owner (or admin) can update
    const { error } = await supabase
        .from('calendar_blocks')
        .update({ title, start_time: startTime, end_time: endTime, note: note || null })
        .eq('id', id)

    if (error) {
        console.error('Error updating calendar block:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/calendar')
    return { success: true }
}

export async function deleteCalendarBlock(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // RLS on calendar_blocks enforces that only the owner (or admin) can delete
    const { error } = await supabase
        .from('calendar_blocks')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting calendar block:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/calendar')
    return { success: true }
}

// Gregorian Easter logic
function easterSundayDate(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed month
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(year, month, day));
}

function swissHolidaysForYear(year: number) {
    const easter = easterSundayDate(year);

    const addDays = (date: Date, days: number) => {
        const d = new Date(date);
        d.setUTCDate(d.getUTCDate() + days);
        return d;
    };

    const karfreitag = addDays(easter, -2);
    const ostermontag = addDays(easter, 1);
    const auffahrtstag = addDays(easter, 39);
    const pfingstmontag = addDays(easter, 50);

    const toYYYYMMDD = (d: Date) => d.toISOString().split('T')[0];

    return [
        { holiday_date: `${year}-01-01`, name: 'Neujahrstag' },
        { holiday_date: `${year}-05-01`, name: 'Tag der Arbeit (1. Mai)' },
        { holiday_date: `${year}-08-01`, name: 'Nationalfeiertag (1. August)' },
        { holiday_date: `${year}-12-25`, name: 'Weihnachtstag' },
        { holiday_date: `${year}-12-26`, name: 'Stephanstag' },
        { holiday_date: toYYYYMMDD(karfreitag), name: 'Karfreitag' },
        { holiday_date: toYYYYMMDD(ostermontag), name: 'Ostermontag' },
        { holiday_date: toYYYYMMDD(auffahrtstag), name: 'Auffahrt' },
        { holiday_date: toYYYYMMDD(pfingstmontag), name: 'Pfingstmontag' },
    ];
}

export async function seedHolidays(year: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    // Fetch profile to verify admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return { error: 'Not authorized' }

    const holidays = swissHolidaysForYear(year);

    const { error } = await supabase
        .from('holidays')
        .upsert(holidays, { onConflict: 'holiday_date' })

    if (error) {
        console.error('Error seeding holidays:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/calendar')
    return { success: true }
}
