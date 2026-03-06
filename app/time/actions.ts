'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTimeEntry(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const categoryId = formData.get('category_id') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const note = formData.get('note') as string

    if (!categoryId || !startTime || !endTime) {
        return { error: 'Missing required fields' }
    }

    // Validate logic serverside as well
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()

    if (end <= start) {
        return { error: 'End time must be after start time' }
    }

    if ((end - start) > 12 * 60 * 60 * 1000) {
        return { error: 'Entry cannot exceed 12 hours' }
    }

    const { error, data } = await supabase
        .from('time_entries')
        .insert({
            user_id: user.id,
            category_id: categoryId,
            start_time: startTime,
            end_time: endTime,
            note: note || null
            // duration_minutes is omitted; handled by DB trigger
        })
        .select()

    if (error) {
        console.error('Error creating time entry:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/time')
    return { success: true, data }
}

export async function updateUserTimeEntry(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Not authenticated' }
    }

    const id = formData.get('id') as string
    const categoryId = formData.get('category_id') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const note = formData.get('note') as string

    if (!id || !categoryId || !startTime || !endTime) {
        return { error: 'Missing required fields' }
    }

    // Validate logic serverside as well
    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()

    if (end <= start) {
        return { error: 'End time must be after start time' }
    }

    if ((end - start) > 12 * 60 * 60 * 1000) {
        return { error: 'Entry cannot exceed 12 hours' }
    }

    // Update using RLS — user can only update their own
    const { error } = await supabase
        .from('time_entries')
        .update({
            category_id: categoryId,
            start_time: startTime,
            end_time: endTime,
            note: note || null
            // duration_minutes is omitted; handled by DB trigger
        })
        .eq('id', id)
        .eq('user_id', user.id) // Extra safety check

    if (error) {
        console.error('Error updating time entry:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/time')
    return { success: true }
}
