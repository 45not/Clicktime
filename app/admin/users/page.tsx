import { requireAdmin, getUserProfile } from '@/lib/auth'
import UserManagementClient from './UserManagementClient'
import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminUsersPage() {
    const profile = await requireAdmin()
    const supabase = await createClient()

    // Fetch all profiles so admin can see who is active
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
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
                            <div className="bg-indigo-50 p-2 rounded-lg">
                                <Users className="h-5 w-5 text-indigo-700" />
                            </div>
                            <span className="font-bold text-slate-900 tracking-tight whitespace-nowrap">Manage Users</span>
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

            <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 border-r border-slate-200 pr-8">
                    <UserManagementClient />

                    <div className="mt-8 p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800 border border-yellow-200">
                        <strong>Note:</strong> You must configure <code>SUPABASE_SERVICE_ROLE_KEY</code> in environment variables for user creation to work.
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-4 font-semibold text-slate-700">Name</th>
                                    <th className="p-4 font-semibold text-slate-700">Role</th>
                                    <th className="p-4 font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {profiles?.map((p) => (
                                    <tr key={p.id}>
                                        <td className="p-4 font-medium text-slate-900">{p.name || 'No Name'}</td>
                                        <td className="p-4 text-slate-600 capitalize">{p.role}</td>
                                        <td className="p-4">
                                            {p.active ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    )
}
