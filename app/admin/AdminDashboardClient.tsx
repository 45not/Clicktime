'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Download, MoreHorizontal, Pencil, Trash2, X, ShieldCheck } from 'lucide-react'
import { updateTimeEntry, deleteTimeEntry } from './actions'
import { useRouter } from 'next/navigation'

type AdminDashboardClientProps = {
    entries: any[]
    users: any[]
    categories: { id: string, name: string, article_number: string }[]
}

export default function AdminDashboardClient({ entries, users, categories }: AdminDashboardClientProps) {
    const router = useRouter()
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    // Three-dots menu
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Edit modal
    const [editEntry, setEditEntry] = useState<any | null>(null)
    const [editUserId, setEditUserId] = useState('')
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [editCategoryId, setEditCategoryId] = useState('')
    const [editNote, setEditNote] = useState('')
    const [editError, setEditError] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            let matches = true
            if (selectedUserId && entry.user_id !== selectedUserId) matches = false
            if (startDate) {
                const entryDate = new Date(entry.start_time).toISOString().split('T')[0]
                if (entryDate < startDate) matches = false
            }
            if (endDate) {
                const entryDate = new Date(entry.start_time).toISOString().split('T')[0]
                if (entryDate > endDate) matches = false
            }
            return matches
        })
    }, [entries, selectedUserId, startDate, endDate])

    const exportCSV = () => {
        if (filteredEntries.length === 0) return
        const headers = ['Date', 'Employee Name', 'Article Number', 'Category Name', 'Duration (Minutes)', 'Note']
        const rows = filteredEntries.map(entry => {
            const date = new Date(entry.start_time).toLocaleDateString('de-CH')
            const name = entry.profiles?.name || 'Unknown'
            const articleNumber = entry.categories?.article_number || ''
            const catName = entry.categories?.name || ''
            const duration = entry.duration_minutes !== null ? entry.duration_minutes : ''
            const note = entry.note ? `"${entry.note.replace(/"/g, '""')}"` : ''
            return [date, `"${name}"`, `"${articleNumber}"`, `"${catName}"`, duration, note].join(',')
        })
        const csvContent = [headers.join(','), ...rows].join('\n')
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `spitex_time_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const toLocalISO = (iso: string) => {
        const d = new Date(iso)
        const tzOffset = d.getTimezoneOffset() * 60000
        return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16)
    }

    const openEdit = (entry: any) => {
        setEditEntry(entry)
        setEditUserId(entry.user_id || '')
        setEditStartTime(entry.start_time ? toLocalISO(entry.start_time) : '')
        setEditEndTime(entry.end_time ? toLocalISO(entry.end_time) : '')
        // We need to find the category id — it's not in the select, so we search by name+article
        const matchedCat = categories.find(c =>
            c.name === entry.categories?.name && c.article_number === entry.categories?.article_number
        )
        setEditCategoryId(matchedCat?.id || '')
        setEditNote(entry.note || '')
        setEditError('')
        setOpenMenuId(null)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editEntry) return
        setIsSaving(true)
        setEditError('')

        const fd = new FormData()
        fd.append('id', editEntry.id)
        fd.append('user_id', editUserId)
        fd.append('start_time', new Date(editStartTime).toISOString())
        if (editEndTime) fd.append('end_time', new Date(editEndTime).toISOString())
        if (editCategoryId) fd.append('category_id', editCategoryId)
        fd.append('note', editNote)

        const result = await updateTimeEntry(fd)
        setIsSaving(false)

        if (result.error) {
            setEditError(result.error)
        } else {
            setEditEntry(null)
            router.refresh()
        }
    }

    const handleDelete = async (entryId: string) => {
        if (!confirm('Are you sure you want to delete this time entry? This cannot be undone.')) return
        setIsDeleting(true)
        setOpenMenuId(null)

        const result = await deleteTimeEntry(entryId)
        setIsDeleting(false)

        if (result.error) {
            alert(`Error: ${result.error}`)
        } else {
            router.refresh()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="p-3 bg-blue-100/50 rounded-xl">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Time Entries</h2>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">Manage and export employee time records</p>
                </div>
            </div>
            <div className="flex items-center space-x-3 w-full sm:w-auto mt-4 sm:mt-0">
                <button
                    onClick={exportCSV}
                    className="h-10 px-6 inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors"
                >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                            <option value="">All Employees</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex-1 space-y-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full h-10 px-3 rounded-md border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-semibold text-slate-700">Date/Time</th>
                                <th className="p-4 font-semibold text-slate-700">Employee</th>
                                <th className="p-4 font-semibold text-slate-700">Category</th>
                                <th className="p-4 font-semibold text-slate-700 text-right">Duration</th>
                                <th className="p-4 font-semibold text-slate-700">Note</th>
                                <th className="p-4 font-semibold text-slate-700 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No time entries found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50/50 group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-900">
                                                {new Date(entry.start_time).toLocaleDateString('de-CH', { timeZone: 'Europe/Zurich' })}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {new Date(entry.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}
                                                {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' })}`}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">
                                            {entry.profiles?.name || 'Unknown User'}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-900">{entry.categories?.name || 'No Category'}</div>
                                            <div className="text-xs text-slate-500">{entry.categories?.article_number}</div>
                                        </td>
                                        <td className="p-4 text-right font-mono font-medium text-blue-700 bg-blue-50/30">
                                            {entry.duration_minutes !== null ? `${entry.duration_minutes}m` : 'Running'}
                                        </td>
                                        <td className="p-4 text-slate-600 max-w-xs truncate" title={entry.note || ''}>
                                            {entry.note || '-'}
                                        </td>
                                        <td className="p-4 relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === entry.id ? null : entry.id)}
                                                className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>

                                            {openMenuId === entry.id && (
                                                <div ref={menuRef} className="absolute right-4 top-12 z-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-36 animate-in fade-in zoom-in-95">
                                                    <button
                                                        onClick={() => openEdit(entry)}
                                                        className="w-full px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" /><span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        className="w-full px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /><span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editEntry && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-900">Edit Time Entry</h3>
                            <button onClick={() => setEditEntry(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {editError && (
                            <div className="mx-5 mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                                {editError}
                            </div>
                        )}

                        <form onSubmit={handleUpdate} className="p-5 space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 block">Employee</label>
                                <select value={editUserId} onChange={e => setEditUserId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">Start Time</label>
                                    <input type="datetime-local" required value={editStartTime}
                                        onChange={e => setEditStartTime(e.target.value)}
                                        className="w-full h-10 px-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">End Time</label>
                                    <input type="datetime-local" value={editEndTime}
                                        onChange={e => setEditEndTime(e.target.value)}
                                        className="w-full h-10 px-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 block">Category</label>
                                <select value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                                    <option value="">No Category</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.article_number} – {c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 block">Note</label>
                                <textarea value={editNote} onChange={e => setEditNote(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    placeholder="Optional note..." />
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button type="button" onClick={() => setEditEntry(null)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving}
                                    className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-colors text-sm">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
