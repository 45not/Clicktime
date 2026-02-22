import { requireEmployee, getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import StopwatchClient from './StopwatchClient'
import { Clock, History } from 'lucide-react'

export default async function EmployeeDashboard() {
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

    // Find if there's an already running timer
    const { data: runningEntry } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', profile.id)
        .is('end_time', null)
        .single()

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-slate-900">Spitex Time Tracker</span>
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
                            Time Tracking
                        </h2>
                        <StopwatchClient
                            categories={categories || []}
                            userId={profile.id}
                            initialRunningEntry={runningEntry || null}
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

                        <div className="divide-y divide-slate-100">
                            {!recentEntries || recentEntries.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-500">
                                    No recent time entries found.
                                </div>
                            ) : (
                                recentEntries.map((entry) => (
                                    <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                        <div>
                                            <div className="font-medium text-slate-900 text-sm">
                                                {/* @ts-ignore - Supabase nested typing */}
                                                {entry.categories.name}
                                                <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {/* @ts-ignore */}
                                                    {entry.categories.article_number}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                                                <span>
                                                    {new Date(entry.start_time).toLocaleString('de-CH', {
                                                        timeZone: 'Europe/Zurich',
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                                {entry.note && (
                                                    <span className="text-slate-400 truncate max-w-[200px] mt-1 sm:mt-0 italic before:content-['·'] before:mr-2 before:hidden sm:before:inline">
                                                        {entry.note}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-base font-semibold text-slate-900 font-mono bg-blue-50 px-3 py-1 rounded-md text-blue-700">
                                                {entry.duration_minutes ? `${entry.duration_minutes}m` : (entry.end_time ? '0m' : 'Running')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}
