import { requireAdmin, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboard() {
    const profile = await requireAdmin()

    // Use Admin Client to ensure visibility regardless of RLS for the dashboard
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for Admin Dashboard')
    }

    const { createClient: createAdminClient } = await import('@supabase/supabase-js')
    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
    )

    // Fetch all users for the filter dropdown
    const { data: users, error: usersError } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .order('name')

    if (usersError) console.error('Admin Users Fetch Error:', usersError)

    // Fetch all time entries
    const { data: entries, error: entriesError } = await supabaseAdmin
        .from('time_entries')
        .select(`
      id,
      start_time,
      end_time,
      duration_minutes,
      note,
      user_id,
      profiles ( name ),
      categories ( name, article_number, fm_section )
    `)
        .order('start_time', { ascending: false })
        .limit(2000)

    if (entriesError) console.error('Admin Entries Fetch Error:', entriesError)

    console.log(`Admin Dashboard: Fetched ${users?.length || 0} users and ${entries?.length || 0} entries.`)

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <ShieldCheck className="h-5 w-5 text-blue-800" />
                        <span className="font-semibold text-slate-900">Admin Dashboard</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                        <Link href="/admin/users" className="text-slate-600 hover:text-slate-900 font-medium">
                            Manage Users
                        </Link>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600">{profile.name} (Admin)</span>
                        <form action="/auth/signout" method="post">
                            <button className="text-blue-600 font-medium hover:text-blue-800">
                                Log out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <AdminDashboardClient
                    entries={entries || []}
                    users={users || []}
                />
            </main>
        </div>
    )
}
