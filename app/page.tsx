import { getUserProfile } from '@/lib/auth'
import Link from 'next/link'
import { Clock, Calendar, ShieldCheck } from 'lucide-react'

export default async function ChooserPage() {
    const profile = await getUserProfile()

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            {/* Logo placeholder if needed, or just a title */}
            <div className="mb-12 flex flex-col items-center select-none cursor-default">
                <img
                    src="/logo.png"
                    alt="Spitex JCare"
                    className="h-16 w-auto object-contain mb-4 border-none outline-none"
                />
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Internal Portal</h1>
                <p className="text-slate-500 mt-2 font-medium">Welcome back, {profile.name}</p>
            </div>

            <div className={`grid grid-cols-1 ${profile.role === 'admin' ? 'md:grid-cols-3' : 'sm:grid-cols-2'} gap-6 w-full max-w-4xl`}>
                <Link
                    href="/time"
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col items-center space-y-4 text-center"
                >
                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors border-none">
                        <Clock className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Time</h2>
                        <p className="text-xs text-slate-500 mt-1">Track your daily work hours</p>
                    </div>
                </Link>

                <Link
                    href="/calendar"
                    className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex flex-col items-center space-y-4 text-center"
                >
                    <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center group-hover:bg-teal-100 transition-colors border-none">
                        <Calendar className="w-7 h-7 text-teal-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Calendar</h2>
                        <p className="text-xs text-slate-500 mt-1">Manage your availability</p>
                    </div>
                </Link>

                {profile.role === 'admin' && (
                    <Link
                        href="/admin/users"
                        className="group bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all flex flex-col items-center space-y-4 text-center"
                    >
                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center group-hover:bg-indigo-100 transition-colors border-none">
                            <ShieldCheck className="w-7 h-7 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Users</h2>
                            <p className="text-xs text-slate-500 mt-1">Manage employee accounts</p>
                        </div>
                    </Link>
                )}
            </div>

            <div className="mt-12">
                <form action="/auth/signout" method="post">
                    <button className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors">
                        Log out of account
                    </button>
                </form>
            </div>
        </div>
    )
}
