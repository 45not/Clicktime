'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Play, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Category = {
    id: string
    name: string
    article_number: string
}

type TimeEntry = {
    id: string
    start_time: string
    end_time: string | null
    category_id: string
    note: string | null
}

export default function StopwatchClient({
    categories,
    userId,
    initialRunningEntry
}: {
    categories: Category[],
    userId: string,
    initialRunningEntry: TimeEntry | null
}) {
    const router = useRouter()
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const [categoryId, setCategoryId] = useState(initialRunningEntry?.category_id || '')
    const [note, setNote] = useState(initialRunningEntry?.note || '')

    const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(initialRunningEntry)
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Timer tick
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (runningEntry) {
            const start = new Date(runningEntry.start_time).getTime()

            const updateElapsed = () => {
                setElapsedSeconds(Math.floor((Date.now() - start) / 1000))
            }

            updateElapsed()
            interval = setInterval(updateElapsed, 1000)
        } else {
            setElapsedSeconds(0)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [runningEntry])

    const formatTime = (totalSeconds: number) => {
        const min = Math.floor(totalSeconds / 60)
        const sec = totalSeconds % 60
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    }

    const handleStart = async () => {
        if (!categoryId) {
            setError('Please select a category first.')
            // Trigger a little shake or highlight
            return
        }
        setError('')
        setIsSubmitting(true)

        const now = new Date().toISOString()
        const { data, error: insertError } = await supabase
            .from('time_entries')
            .insert({
                user_id: userId,
                category_id: categoryId,
                note: note || null,
                start_time: now
            })
            .select()
            .single()

        if (insertError) {
            setError('Failed to start timer. Check if you already have one running.')
            console.error(insertError)
        } else {
            setRunningEntry(data as TimeEntry)
            router.refresh()
        }
        setIsSubmitting(false)
    }

    const handleStop = async () => {
        if (!runningEntry) return
        setIsSubmitting(true)

        const now = new Date()
        const start = new Date(runningEntry.start_time)
        const durationMinutes = Math.round((now.getTime() - start.getTime()) / 60000)

        const { error: updateError } = await supabase
            .from('time_entries')
            .update({
                end_time: now.toISOString(),
                duration_minutes: durationMinutes
            })
            .eq('id', runningEntry.id)

        if (updateError) {
            setError('Failed to stop timer.')
            console.error(updateError)
        } else {
            setRunningEntry(null)
            setCategoryId('')
            setNote('')
            router.refresh()
        }
        setIsSubmitting(false)
    }

    // Process categories for grouping
    // We'll group by article_number prefix or fm_section
    // Rule: if length is 1 or 2, it's a header. If 3+, it's an item.
    const groupedCategories = useMemo(() => {
        const result: { header: string; items: Category[] }[] = []
        let currentGroup: { header: string; items: Category[] } | null = null

        categories.sort((a, b) => a.article_number.localeCompare(b.article_number)).forEach(cat => {
            const isHeader = cat.article_number.length <= 2 || cat.article_number.endsWith('-')

            if (isHeader) {
                currentGroup = { header: `${cat.article_number} ${cat.name}`, items: [] }
                result.push(currentGroup)
            } else {
                if (!currentGroup) {
                    currentGroup = { header: 'Other', items: [] }
                    result.push(currentGroup)
                }
                currentGroup.items.push(cat)
            }
        })
        return result
    }, [categories])

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 animate-in fade-in slide-in-from-top-1">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Activity Category
                    </label>
                    <select
                        value={categoryId}
                        onChange={(e) => {
                            setCategoryId(e.target.value)
                            if (error) setError('')
                        }}
                        disabled={!!runningEntry || isSubmitting}
                        className={`w-full rounded-md border ${!categoryId && error ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'} px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors`}
                    >
                        <option value="" disabled>Select a category...</option>
                        {groupedCategories.map((group, idx) => (
                            <optgroup key={idx} label={group.header}>
                                {group.items.map((c: Category) => (
                                    <option key={c.id} value={c.id}>
                                        {c.article_number} - {c.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        Optional Note
                    </label>
                    <input
                        type="text"
                        placeholder="Do not include patient identifiers"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={!!runningEntry || isSubmitting}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                    />
                </div>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-100 pb-10">
                <div className="text-5xl sm:text-7xl font-mono text-slate-800 tracking-tight font-medium mb-8 tabular-nums">
                    {formatTime(elapsedSeconds)}
                </div>

                {runningEntry ? (
                    <button
                        onClick={handleStop}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto min-w-[200px] flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-transform active:scale-95 shadow-md shadow-red-600/20 disabled:opacity-70"
                    >
                        <Square className="w-5 h-5 fill-current" />
                        <span>Stop Timer</span>
                    </button>
                ) : (
                    <button
                        onClick={handleStart}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto min-w-[200px] flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-transform active:scale-95 shadow-md shadow-blue-600/20 disabled:opacity-70 disabled:active:scale-100 disabled:bg-blue-300 disabled:shadow-none"
                    >
                        <Play className="w-5 h-5 fill-current" />
                        <span>Start Timer</span>
                    </button>
                )}
            </div>
        </div>
    )
}
