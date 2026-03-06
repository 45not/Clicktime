import { requireAdmin, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import AdminDashboardClient from './AdminDashboardClient'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
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

    // Fetch all categories for edit dropdown
    const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('id, name, article_number')
        .order('name')



    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4 md:space-x-8">
                        <Link href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-semibold hidden sm:inline">Portal</span>
                        </Link>

                        <div className="h-6 w-[1px] bg-slate-200" />

                        <div className="flex items-center space-x-3">
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-blue-700" />
                            </div>
                            <span className="font-bold text-slate-900 tracking-tight whitespace-nowrap">Admin Dashboard</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-slate-900">{profile.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Administrator</span>
                        </div>
                        <form action="/auth/signout" method="post">
                            <button className="text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors">
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
                    categories={categories || []}
                />
            </main>
        </div>
    )
}
