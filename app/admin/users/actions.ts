'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

export async function createUserAction(formData: FormData) {
    const email = formData.get('email') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string || 'employee'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!email || !name || !password) {
        return { error: 'Email, name, and password are required.' }
    }

    if (!serviceRoleKey) {
        return { error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. Cannot create users via Admin API.' }
    }

    // Use the service role key to bypass RLS and use the Admin API
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    // 1. Create the user in Supabase Auth with a set password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
    })

    if (authError) {
        console.error('Auth error:', authError)
        return { error: authError.message }
    }

    const userId = authData.user.id

    // 2. Insert into profiles table
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
            id: userId,
            name: name,
            role: role,
            active: true
        })

    if (profileError) {
        console.error('Profile error:', profileError)
        return { error: profileError.message }
    }

    revalidatePath('/admin/users')
    return { success: true }
}
