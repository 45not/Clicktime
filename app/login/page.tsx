import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error: string }> }) {
    const { error } = await searchParams

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 w-full relative">
            {/* Logo in the top right corner */}
            <img
                src="/logo.png"
                alt="Spitex JCare"
                className="absolute top-6 right-6 h-12 md:h-16 w-auto object-contain select-none pointer-events-none"
            />

            <div className="w-full max-w-sm mt-12">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                    <form action={login} className="space-y-6" suppressHydrationWarning>
                        <div className="space-y-2">
                            <label
                                className="text-sm font-semibold text-slate-700 block"
                                htmlFor="email"
                            >
                                Email address
                            </label>
                            <input
                                className="block h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                                id="email"
                                name="email"
                                type="email"
                                placeholder="info@j-care.ch"
                                defaultValue="info@j-care.ch"
                                required
                                suppressHydrationWarning
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-sm font-semibold text-slate-700 block"
                                htmlFor="password"
                            >
                                Password
                            </label>
                            <input
                                className="block h-12 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                suppressHydrationWarning
                            />
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg flex items-center">
                                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full h-12 mt-4 flex items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:scale-[0.98] shadow-md shadow-blue-600/20"
                        >
                            Sign In
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
