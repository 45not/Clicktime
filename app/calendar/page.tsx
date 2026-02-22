import { getUserProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import CalendarClient from './CalendarClient'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react'

export default async function CalendarPage() {
    const profile = await getUserProfile()
    const supabase = await createClient()

    // Fetch blocks
    // User SELECT relies on RLS (shows only own)
    // Admin SELECT retrieves all if policies allow, but let's be explicit
    let query = supabase
        .from('calendar_blocks')
        .select('*')
        .order('start_time', { ascending: true })

    if (profile.role !== 'admin') {
        query = query.eq('user_id', profile.id)
    }

    const { data: blocks, error: blockError } = await query

    // Fetch profiles separately to bypass missing DB relationship
    const { data: allProfiles } = await supabase.from('profiles').select('id, name')
    const profileMap = new Map(allProfiles?.map(p => [p.id, p.name]) || [])

    const processedBlocks = blocks?.map(b => ({
        ...b,
        profiles: { name: profileMap.get(b.user_id) || 'Unknown' }
    })) || []

    console.log(`CalendarPage: Fetched ${processedBlocks.length} processed blocks. Total profiles mapped: ${profileMap.size}`)
    if (blockError) {
        console.error('Calendar Fetch Error:', blockError)
    }

    // Fetch all profiles for Admin user selection
    let users: any[] = []
    if (profile.role === 'admin') {
        const { data: userData } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('active', true)
            .order('name')
        users = userData || []
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4 md:space-x-8">
                        <Link href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-semibold hidden sm:inline">Portal</span>
                        </Link>

                        <div className="h-6 w-[1px] bg-slate-200" />

                        <div className="flex items-center space-x-3">
                            <div className="bg-teal-50 p-2 rounded-lg">
                                <CalendarIcon className="h-5 w-5 text-teal-700" />
                            </div>
                            <span className="font-bold text-slate-900 tracking-tight whitespace-nowrap">Availability Calendar</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-slate-900">{profile.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 capitalize tracking-wider">{profile.role}</span>
                        </div>
                        <form action="/auth/signout" method="post">
                            <button className="text-sm text-blue-600 font-bold hover:text-blue-800 transition-colors">
                                Log out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-0">
                <CalendarClient
                    initialBlocks={processedBlocks}
                    userId={profile.id}
                    isAdmin={profile.role === 'admin'}
                    users={users}
                />
            </main>
        </div>
    )
}
