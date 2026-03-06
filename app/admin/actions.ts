'use server'

import { revalidatePath } from 'next/cache'

// Uses service role key to bypass RLS — only called from admin pages
async function getAdminClient() {
    const { createClient } = await import('@supabase/supabase-js')
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function updateTimeEntry(formData: FormData) {
    const supabase = await getAdminClient()

    const id = formData.get('id') as string
    const userId = formData.get('user_id') as string
    const startTime = formData.get('start_time') as string
    const endTime = formData.get('end_time') as string
    const categoryId = formData.get('category_id') as string
    const note = formData.get('note') as string

    if (!id) return { error: 'Missing entry ID' }

    const updateObj: Record<string, any> = {}
    if (userId) updateObj.user_id = userId
    if (startTime) updateObj.start_time = startTime
    if (endTime) updateObj.end_time = endTime
    if (categoryId) updateObj.category_id = categoryId
    if (note !== null) updateObj.note = note || null

    if (updateObj.start_time && updateObj.end_time) {
        const start = new Date(updateObj.start_time)
        const end = new Date(updateObj.end_time)
        updateObj.duration_minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    }

    const { error } = await supabase
        .from('time_entries')
        .update(updateObj)
        .eq('id', id)

    if (error) {
        console.error('Error updating time entry:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true }
}

export async function deleteTimeEntry(id: string) {
    const supabase = await getAdminClient()

    const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('Error deleting time entry:', error)
        return { error: `Database error: ${error.message}` }
    }

    revalidatePath('/admin')
    return { success: true }
}
