import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type UserRole = 'admin' | 'employee'

export interface UserProfile {
    id: string
    name: string
    role: UserRole
    active: boolean
}

export async function getUserProfile(): Promise<UserProfile> {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        redirect('/login')
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        console.error('Profile fetch error:', profileError, 'Profile:', profile, 'User UID:', user?.id)
        // Basic fallback if profile doesn't exist yet but user does
        // For this strict app, we might just block them, but let's redirect to login and log them out
        await supabase.auth.signOut()
        redirect('/login?error=Profile not found')
    }

    if (!profile.active) {
        await supabase.auth.signOut()
        redirect('/login?error=Account disabled')
    }

    return profile as UserProfile
}

export async function requireEmployee() {
    const profile = await getUserProfile()
    if (profile.role === 'admin') {
        redirect('/admin')
    }
    return profile
}

export async function requireAdmin() {
    const profile = await getUserProfile()
    if (profile.role !== 'admin') {
        redirect('/')
    }
    return profile
}
