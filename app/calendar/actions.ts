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

    console.log(`Creating calendar block for user ${targetUserId}:`, { title, startTime, endTime })

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
        console.error('Error creating calendar block in Supabase:', error)
        return { error: `Database error: ${error.message} (Code: ${error.code})` }
    }

    console.log('Successfully created block:', data)
    revalidatePath('/calendar')
    return { success: true }
}
