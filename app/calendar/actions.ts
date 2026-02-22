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
            end_time: endTime
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

    if (!id || !title || !startTime || !endTime) {
        return { error: 'Missing required fields' }
    }

    // RLS on calendar_blocks enforces that only the owner (or admin) can update
    const { error } = await supabase
        .from('calendar_blocks')
        .update({ title, start_time: startTime, end_time: endTime })
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
