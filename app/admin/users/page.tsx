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
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link href="/admin" className="text-slate-400 hover:text-slate-600">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div className="font-semibold text-slate-900 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-blue-800" />
                            Manage Users
                        </div>
                    </div>
                    <div className="text-sm">
                        <span className="text-slate-600">{profile.name} (Admin)</span>
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
