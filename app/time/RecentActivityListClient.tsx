'use client'

import { useState } from 'react'
import { Pencil, X, Save, AlertCircle } from 'lucide-react'
import { updateUserTimeEntry } from './actions'

type Category = {
    id: string
    name: string
    article_number: string
}

type TimeEntry = {
    id: string
    start_time: string
    end_time: string
    duration_minutes: number
    note: string
    categories: {
        name: string
        article_number: string
    }
}

export default function RecentActivityListClient({
    entries,
    categories
}: {
    entries: TimeEntry[],
    categories: Category[]
}) {
    const [editingId, setEditingId] = useState<string | null>(null)

    // Edit form state
    const [editCategoryId, setEditCategoryId] = useState('')
    const [editDate, setEditDate] = useState('')
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editNote, setEditNote] = useState('')

    const [isSaving, setIsSaving] = useState(false)
    const [submitError, setSubmitError] = useState('')

    const toLocalISOString = (isoDateStr: string) => {
        const d = new Date(isoDateStr)
        const tzOffsetMs = d.getTimezoneOffset() * 60000
        return new Date(d.getTime() - tzOffsetMs).toISOString()
    }

    const startEditing = (entry: TimeEntry) => {
        setSubmitError('')
        setEditingId(entry.id)

        // Find matching category
        const matchedCat = categories.find(c =>
            c.name === entry.categories?.name && c.article_number === entry.categories?.article_number
        )
        setEditCategoryId(matchedCat?.id || '')

        const localStart = toLocalISOString(entry.start_time)
        const localEnd = toLocalISOString(entry.end_time)

        setEditDate(localStart.split('T')[0])
        setEditStartTime(localStart.slice(11, 16))
        setEditEndTime(localEnd.slice(11, 16))
        setEditNote(entry.note || '')
    }

    const handleSaveList = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId) return

        if (!editCategoryId || !editDate || !editStartTime || !editEndTime) {
            setSubmitError('Please fill out all time fields.')
            return
        }

        setIsSaving(true)
        setSubmitError('')

        const startStr = `${editDate}T${editStartTime}:00`
        const endStr = `${editDate}T${editEndTime}:00`

        const startISO = new Date(startStr).toISOString()
        const endISO = new Date(endStr).toISOString()

        const fd = new FormData()
        fd.append('id', editingId)
        fd.append('category_id', editCategoryId)
        fd.append('start_time', startISO)
        fd.append('end_time', endISO)
        fd.append('note', editNote)

        const result = await updateUserTimeEntry(fd)

        setIsSaving(false)
        if (result.error) {
            setSubmitError(result.error)
        } else {
            setEditingId(null)
        }
    }

    if (!entries || entries.length === 0) {
        return (
            <div className="p-8 text-center text-sm text-slate-500">
                No recent time entries found.
            </div>
        )
    }

    return (
        <div className="divide-y divide-slate-100">
            {entries.map((entry) => (
                <div key={entry.id} className="group flex flex-col transition-colors">
                    {/* View Mode */}
                    {editingId !== entry.id && (
                        <div className="p-4 hover:bg-slate-50 flex justify-between items-center relative gap-4">
                            <div className="flex-1">
                                <div className="font-medium text-slate-900 text-sm">
                                    {entry.categories.name}
                                    <span className="ml-2 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                        {entry.categories.article_number}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                                    <span>
                                        {new Date(entry.start_time).toLocaleString('de-CH', {
                                            timeZone: 'Europe/Zurich',
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                        })}{' '}
                                        {new Date(entry.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}
                                        {' '}–{' '}
                                        {new Date(entry.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}
                                    </span>
                                    {entry.note && (
                                        <span className="text-slate-400 truncate max-w-[200px] mt-1 sm:mt-0 italic before:content-['·'] before:mr-2 before:hidden sm:before:inline">
                                            {entry.note}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right flex items-center space-x-4">
                                <div className="text-base font-semibold text-slate-900 font-mono bg-blue-50 px-3 py-1 rounded-md text-blue-700 w-[70px] text-center">
                                    {entry.duration_minutes ? (() => {
                                        const h = Math.floor(entry.duration_minutes / 60)
                                        const m = entry.duration_minutes % 60
                                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
                                    })() : '00:00'}
                                </div>

                                <button
                                    onClick={() => startEditing(entry)}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 focus:opacity-100"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Edit Mode */}
                    {editingId === entry.id && (
                        <div className="p-4 bg-slate-50 border-y border-slate-200 shadow-inner">
                            <form onSubmit={handleSaveList} className="space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                                    <h4 className="font-bold text-slate-800 text-sm">Edit Entry</h4>
                                    <button type="button" onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {submitError && (
                                    <div className="bg-red-50 text-red-600 p-2 rounded text-xs border border-red-100 flex items-center space-x-1">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>{submitError}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 block">Category</label>
                                        <select
                                            value={editCategoryId}
                                            onChange={e => setEditCategoryId(e.target.value)}
                                            className="w-full h-8 px-2 rounded font-medium text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.article_number} – {c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 block">Date</label>
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={e => setEditDate(e.target.value)}
                                            className="w-full h-8 px-2 rounded font-mono text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 block">Start Time</label>
                                        <input
                                            type="time"
                                            value={editStartTime}
                                            onChange={e => setEditStartTime(e.target.value)}
                                            className="w-full h-8 px-2 rounded font-mono text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-slate-700 block">End Time</label>
                                        <input
                                            type="time"
                                            value={editEndTime}
                                            onChange={e => setEditEndTime(e.target.value)}
                                            className="w-full h-8 px-2 rounded font-mono text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 block">Note</label>
                                    <input
                                        type="text"
                                        value={editNote}
                                        onChange={e => setEditNote(e.target.value)}
                                        className="w-full h-8 px-2 rounded text-xs border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                                    />
                                </div>

                                <div className="flex space-x-2 pt-2">
                                    <button type="button" onClick={() => setEditingId(null)}
                                        className="flex-1 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-md hover:bg-slate-50 transition-colors text-xs shadow-sm">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSaving}
                                        className="flex-1 py-1.5 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-slate-300 transition-colors text-xs flex items-center justify-center space-x-1 shadow-sm">
                                        <Save className="w-3.5 h-3.5" />
                                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
