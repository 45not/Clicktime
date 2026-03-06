import { requireEmployee, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import TimeTrackerClient from './TimeTrackerClient'
import RecentActivityListClient from './RecentActivityListClient'
import { Clock, History, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TimeTrackingPage() {
    const profile = await requireEmployee()
    const supabase = await createClient()

    // Fetch selectable categories
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('article_number')

    // Fetch recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentEntries } = await supabase
        .from('time_entries')
        .select(`
            id,
            start_time,
            end_time,
            duration_minutes,
            note,
            categories ( name, article_number )
        `)
        .eq('user_id', profile.id)
        .gte('start_time', sevenDaysAgo.toISOString())
        .order('start_time', { ascending: false })

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-slate-900">Time Tracking</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                        <span className="text-slate-600">{profile.name}</span>
                        <form action="/auth/signout" method="post">
                            <button className="text-blue-600 font-medium hover:text-blue-800">
                                Log out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                <section>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                            <Clock className="w-5 h-5 mr-2 text-slate-400" />
                            Time Entry
                        </h2>
                        <TimeTrackerClient
                            categories={categories || []}
                        />
                    </div>
                </section>

                <section>
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-base font-semibold text-slate-900 flex items-center">
                                <History className="w-4 h-4 mr-2 text-slate-400" />
                                Recent Activity
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">Last 7 Days</span>
                        </div>

                        <RecentActivityListClient
                            entries={recentEntries as any}
                            categories={categories || []}
                        />
                    </div>
                </section>
            </main>
        </div>
    )
}
