'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Square, Save, AlertCircle } from 'lucide-react'
import { createTimeEntry } from './actions'

type Category = {
    id: string
    name: string
    article_number: string
}

function formatDuration(start: string, end: string): { text: string, error?: string, ms: number } {
    if (!start || !end) return { text: '--:--', ms: 0 }

    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const ms = endTime - startTime

    if (ms < 0) {
        return { text: '--:--', error: 'End time must be after start time', ms }
    }

    if (ms > 12 * 60 * 60 * 1000) {
        return { text: '--:--', error: 'Entry cannot exceed 12 hours', ms }
    }

    const totalMinutes = Math.floor(ms / 60000)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return {
        text: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        ms
    }
}

function toLocalISOString(date: Date) {
    const tzOffsetMs = date.getTimezoneOffset() * 60000
    const localISOTime = new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16)
    return localISOTime
}

export default function TimeTrackerClient({
    categories,
    onSaveSuccess
}: {
    categories: Category[],
    onSaveSuccess?: () => void
}) {
    const [categoryId, setCategoryId] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // We use ISO strings for the datetime-local inputs
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')

    const [note, setNote] = useState('')

    const [isRunning, setIsRunning] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [submitError, setSubmitError] = useState('')

    // Client side timer
    useEffect(() => {
        let interval: NodeJS.Timeout
        if (isRunning && startTime) {
            // Update the display every minute so the elapsed time looks alive,
            // though for UI we just rely on endTime being empty,
            // but we can optionally auto-update endTime so duration preview ticks.
            // Actually, requirements say: "Stop Timer sets end_time = now".
            // So while running, we can just optionally update endTime.
            interval = setInterval(() => {
                // Not updating endTime automatically here so user can type.
                // Or maybe we should? The prompt says "Stop Timer sets end_time = now".
            }, 1000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isRunning, startTime])

    // Derive duration
    let startFull = ''
    let endFull = ''
    if (startTime) {
        // combine date and start time
        startFull = new Date(`${date}T${startTime}`).toISOString()
    }
    if (endTime) {
        endFull = new Date(`${date}T${endTime}`).toISOString()
    }

    // Actually, datetime-local includes both date and time natively.
    // Let's change this: `date` field was requested, but standard `datetime-local` combines them.
    // The prompt asked for: "Date (default today), Start time (required), End time (required)".
    // So let's use separate inputs.

    const { text: durationText, error: durationError, ms: durationMs } = useMemo(() => {
        if (!date || !startTime || !endTime) return { text: '--:--', ms: 0 }

        // Construct standard ISO strings
        const startStr = `${date}T${startTime}`
        const endStr = `${date}T${endTime}`
        return formatDuration(startStr, endStr)
    }, [date, startTime, endTime])

    const handleStartTimer = () => {
        const now = new Date()
        const tzOffsetMs = now.getTimezoneOffset() * 60000
        const localNow = new Date(now.getTime() - tzOffsetMs)

        const currentDateStr = localNow.toISOString().split('T')[0]
        const currentTimeStr = localNow.toISOString().slice(11, 16) // HH:MM

        setDate(currentDateStr)
        setStartTime(currentTimeStr)
        setEndTime('')
        setIsRunning(true)
        setSubmitError('')
    }

    const handleStopTimer = () => {
        const now = new Date()
        const tzOffsetMs = now.getTimezoneOffset() * 60000
        const localNow = new Date(now.getTime() - tzOffsetMs)

        const currentTimeStr = localNow.toISOString().slice(11, 16) // HH:MM

        setEndTime(currentTimeStr)
        setIsRunning(false)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!categoryId) {
            setSubmitError('Please select a category.')
            return
        }
        if (!date || !startTime || !endTime) {
            setSubmitError('Please fill out all time fields.')
            return
        }
        if (durationError) {
            setSubmitError(durationError)
            return
        }

        setIsSaving(true)
        setSubmitError('')

        // Format to strict ISO 8601 for the server
        const startISO = new Date(`${date}T${startTime}:00`).toISOString()
        const endISO = new Date(`${date}T${endTime}:00`).toISOString()

        const fd = new FormData()
        fd.append('category_id', categoryId)
        fd.append('start_time', startISO)
        fd.append('end_time', endISO)
        fd.append('note', note)

        const result = await createTimeEntry(fd)

        setIsSaving(false)

        if (result.error) {
            setSubmitError(result.error)
        } else {
            // Reset form
            setCategoryId('')
            setStartTime('')
            setEndTime('')
            setNote('')
            setIsRunning(false)
            if (onSaveSuccess) onSaveSuccess()
        }
    }

    // Process categories for grouping
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

    const isValid = categoryId && date && startTime && endTime && !durationError && !isRunning

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                </div>
            )}

            {durationError && !submitError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100 flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{durationError}</span>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        required
                        value={categoryId}
                        onChange={(e) => {
                            setCategoryId(e.target.value)
                            if (submitError) setSubmitError('')
                        }}
                        className={`w-full rounded-md border ${!categoryId && (submitError) ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'} px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                Start <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">
                                End <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={`w-full rounded-md border ${durationError ? 'border-red-500 bg-red-50' : 'border-slate-300 bg-white'} px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-sm font-medium text-slate-600">Duration Preview</span>
                    <span className={`text-xl font-bold font-mono tracking-tight ${durationError ? 'text-red-600' : 'text-blue-700'}`}>
                        {durationText}
                    </span>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Optional Note
                    </label>
                    <textarea
                        rows={2}
                        placeholder="Do not include patient identifiers"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {isRunning ? (
                    <button
                        type="button"
                        onClick={handleStopTimer}
                        className="flex w-full items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
                    >
                        <Square className="w-4 h-4 fill-current" />
                        <span>Stop Timer</span>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleStartTimer}
                        className="flex w-full items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm"
                    >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Start Timer</span>
                    </button>
                )}

                <button
                    type="submit"
                    disabled={!isValid || isSaving || isRunning}
                    className="flex w-full items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-400 disabled:hover:bg-slate-400"
                >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Entry'}</span>
                </button>
            </div>
            {isRunning && (
                <p className="text-xs text-center text-slate-500 mt-2 font-medium">
                    Timer is running. Stop it before saving.
                </p>
            )}
        </form>
    )
}
