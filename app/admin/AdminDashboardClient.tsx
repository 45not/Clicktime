'use client'

import { useState, useMemo } from 'react'
import { Download, Filter, Search } from 'lucide-react'

type AdminDashboardClientProps = {
    entries: any[]
    users: any[]
}

export default function AdminDashboardClient({ entries, users }: AdminDashboardClientProps) {
    const [selectedUserId, setSelectedUserId] = useState<string>('')
    const [startDate, setStartDate] = useState<string>('')
    const [endDate, setEndDate] = useState<string>('')

    const filteredEntries = useMemo(() => {
        return entries.filter(entry => {
            let matches = true

            if (selectedUserId && entry.user_id !== selectedUserId) {
                matches = false
            }

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

        // CSV format: Date, Employee Name, Article Number, Category Name, Duration (Minutes), Note
        const headers = ['Date', 'Employee Name', 'Article Number', 'Category Name', 'Duration (Minutes)', 'Note']

        const rows = filteredEntries.map(entry => {
            const date = new Date(entry.start_time).toLocaleDateString('de-CH')
            const name = entry.profiles?.name || 'Unknown'
            const articleNumber = entry.categories?.article_number || ''
            const catName = entry.categories?.name || ''
            const duration = entry.duration_minutes !== null ? entry.duration_minutes : ''
            const note = entry.note ? `"${entry.note.replace(/"/g, '""')}"` : '' // Escape quotes

            return [date, `"${name}"`, `"${articleNumber}"`, `"${catName}"`, duration, note].join(',')
        })

        const csvContent = [headers.join(','), ...rows].join('\n')

        // BOM for UTF-8 Excel compatibility
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `spitex_time_export_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
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

                    <button
                        onClick={exportCSV}
                        className="h-10 px-6 inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                    </button>
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
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No time entries found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map(entry => (
                                    <tr key={entry.id} className="hover:bg-slate-50/50">
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
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
