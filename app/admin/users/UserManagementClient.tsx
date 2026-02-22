'use client'

import { useState } from 'react'
import { createUserAction } from './actions'
import { UserPlus } from 'lucide-react'

export default function UserManagementClient() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')
        setSuccess('')

        const formData = new FormData(e.currentTarget)
        const result = await createUserAction(formData)

        if (result.error) {
            setError(result.error)
        } else if (result.success) {
            setSuccess('User created successfully! You can now share the password with them.')
            // @ts-ignore
            e.target.reset()
        }

        setIsSubmitting(false)
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-slate-400" />
                Create New Employee
            </h2>

            {error && (
                <div className="mb-6 p-4 rounded-md bg-red-50 text-red-700 text-sm border border-red-100">
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-6 p-4 rounded-md bg-green-50 text-green-700 text-sm border border-green-100">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                        Full Name
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        placeholder="Jane Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                        Email Address
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        placeholder="jane@spitex-jcare.ch"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        disabled={isSubmitting}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        placeholder="••••••••"
                        minLength={6}
                    />
                </div>

                <input type="hidden" name="role" value="employee" />

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white h-10 rounded-md font-medium transition-colors disabled:opacity-70"
                >
                    {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
            </form>
        </div>
    )
}
