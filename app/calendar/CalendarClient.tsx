'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createCalendarBlock, updateCalendarBlock, deleteCalendarBlock } from './actions'
import { Plus, ChevronLeft, ChevronRight, X, ArrowLeft, Info, Clock as ClockIcon, User, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type CalendarBlock = {
    id: string
    user_id: string
    start_time: string
    end_time: string
    title: string
    profiles?: { name: string }
}

interface CalendarClientProps {
    initialBlocks: CalendarBlock[]
    userId: string
    isAdmin: boolean
    users: { id: string, name: string }[]
}

const START_HOUR = 0;
const END_HOUR = 23;
const ROW_HEIGHT = 60; // pixels per hour

const roundToNext15Minutes = (date: Date) => {
    const ms = 1000 * 60 * 15;
    return new Date(Math.ceil(date.getTime() / ms) * ms);
};

const getMinuteOffset = (timeStr: string) => {
    const date = new Date(timeStr);
    const minutes = (date.getHours() - START_HOUR) * 60 + date.getMinutes();
    return (minutes / 60) * ROW_HEIGHT;
};

const getDurationHeight = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const durationMinutes = (e.getTime() - s.getTime()) / (1000 * 60);
    return (durationMinutes / 60) * ROW_HEIGHT;
};

export default function CalendarClient({ initialBlocks, userId, isAdmin, users }: CalendarClientProps) {
    const router = useRouter()
    const [viewMode, setViewMode] = useState<'grid' | 'schedule'>('schedule')
    const [currentDate, setCurrentDate] = useState(new Date())
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [selectedBlock, setSelectedBlock] = useState<CalendarBlock | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editStartTime, setEditStartTime] = useState('')
    const [editEndTime, setEditEndTime] = useState('')
    const [error, setError] = useState('')
    const [detailError, setDetailError] = useState('')
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to 7:00 on mount
    useEffect(() => {
        if (scrollContainerRef.current) {
            // Wait a tiny bit for render
            setTimeout(() => {
                const scrollPos = 7 * ROW_HEIGHT;
                scrollContainerRef.current?.scrollTo({ top: scrollPos, behavior: 'auto' });
            }, 100);
        }
    }, [viewMode]); // Also re-scroll if switching back to grid

    // Form state
    const [title, setTitle] = useState('')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    const [targetUserId, setTargetUserId] = useState(userId)

    // Calculate dates for current week (Monday-Sunday)
    const weekDates = useMemo(() => {
        const start = new Date(currentDate)
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(start.setDate(diff))
        monday.setHours(0, 0, 0, 0)

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(monday)
            date.setDate(monday.getDate() + i)
            return date
        })
    }, [currentDate])

    const nextWeek = () => {
        const next = new Date(currentDate)
        next.setDate(next.getDate() + 7)
        setCurrentDate(next)
    }

    const prevWeek = () => {
        const prev = new Date(currentDate)
        prev.setDate(prev.getDate() - 7)
        setCurrentDate(prev)
    }

    const openCreateModal = (date: Date) => {
        const now = new Date();
        const start = roundToNext15Minutes(new Date(now));

        // Adjust start to be on the clicked day but with rounded time from 'now'
        start.setFullYear(date.getFullYear());
        start.setMonth(date.getMonth());
        start.setDate(date.getDate());

        const end = new Date(start.getTime() + 30 * 60 * 1000);

        const toLocalISO = (d: Date) => {
            const tzOffset = d.getTimezoneOffset() * 60000;
            return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        };

        setStartTime(toLocalISO(start));
        setEndTime(toLocalISO(end));
        setTitle('')
        setTargetUserId(userId)
        setError('')
        setIsModalOpen(true)
    }

    const openDetailModal = (block: CalendarBlock) => {
        setSelectedBlock(block)
        setIsEditing(false)
        setDetailError('')
        setIsDetailModalOpen(true)
    }

    const startEditing = () => {
        if (!selectedBlock) return
        const toLocalISO = (iso: string) => {
            const d = new Date(iso)
            const tzOffset = d.getTimezoneOffset() * 60000
            return (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16)
        }
        setEditTitle(selectedBlock.title)
        setEditStartTime(toLocalISO(selectedBlock.start_time))
        setEditEndTime(toLocalISO(selectedBlock.end_time))
        setDetailError('')
        setIsEditing(true)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedBlock) return
        setIsSubmitting(true)
        setDetailError('')

        const fd = new FormData()
        fd.append('id', selectedBlock.id)
        fd.append('title', editTitle)
        fd.append('start_time', new Date(editStartTime).toISOString())
        fd.append('end_time', new Date(editEndTime).toISOString())

        const result = await updateCalendarBlock(fd)
        setIsSubmitting(false)

        if (result.error) {
            setDetailError(result.error)
        } else {
            setIsDetailModalOpen(false)
            setIsEditing(false)
            router.refresh()
        }
    }

    const handleDelete = async () => {
        if (!selectedBlock) return
        if (!confirm('Are you sure you want to delete this block?')) return
        setIsDeleting(true)
        setDetailError('')

        const result = await deleteCalendarBlock(selectedBlock.id)
        setIsDeleting(false)

        if (result.error) {
            setDetailError(result.error)
        } else {
            setIsDetailModalOpen(false)
            router.refresh()
        }
    }

    const canEditBlock = (block: CalendarBlock) => isAdmin || block.user_id === userId

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setError('')

        // Convert to absolute ISO string for the server
        const startISO = new Date(startTime).toISOString();
        const endISO = new Date(endTime).toISOString();

        const formData = new FormData()
        formData.append('title', title)
        formData.append('start_time', startISO)
        formData.append('end_time', endISO)
        formData.append('target_user_id', targetUserId)

        const result = await createCalendarBlock(formData)

        if (result.error) {
            setError(result.error)
            setIsSubmitting(false)
        } else {
            setIsSubmitting(false)
            setIsModalOpen(false)
        }
    }

    const isOverlapping = useMemo(() => {
        if (!startTime || !endTime) return false;
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();

        return initialBlocks.some(block => {
            // Only check blocks for the selected user
            if (block.user_id !== targetUserId) return false;

            const bStart = new Date(block.start_time).getTime();
            const bEnd = new Date(block.end_time).getTime();
            return (start < bEnd && end > bStart);
        });
    }, [startTime, endTime, targetUserId, initialBlocks]);

    // Group blocks by day for schedule view
    const sortedBlocksByDay = useMemo(() => {
        const groups: { [date: string]: CalendarBlock[] } = {}

        // Use weekDates to ensure all days of the current week are accounted for
        weekDates.forEach(date => {
            groups[date.toDateString()] = []
        })

        initialBlocks.forEach(block => {
            const date = new Date(block.start_time).toDateString()
            if (groups[date]) {
                groups[date].push(block)
            }
        })

        // Sort blocks within each day
        Object.keys(groups).forEach(date => {
            groups[date].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        })

        return groups
    }, [initialBlocks, weekDates])

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-[600px]">
            {/* Calendar Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-30">
                <div className="flex items-center space-x-4 md:space-x-8">
                    <Link href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-semibold hidden sm:inline">Portal</span>
                    </Link>

                    <div className="h-6 w-[1px] bg-slate-200" />

                    <div className="flex items-center space-x-2">
                        <button onClick={prevWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                            <ChevronLeft className="w-4 h-4 text-slate-600" />
                        </button>
                        <h2 className="text-sm md:text-base font-bold text-slate-800 min-w-[100px] md:min-w-[150px] text-center select-none capitalize">
                            {weekDates[0].toLocaleDateString('de-CH', { month: 'short', year: 'numeric' })}
                        </h2>
                        <button onClick={nextWeek} className="p-1.5 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100">
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {/* View Switcher Mobile Only */}
                    <div className="md:hidden flex bg-slate-100 p-1 rounded-lg mr-2">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Grid
                        </button>
                        <button
                            onClick={() => setViewMode('schedule')}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'schedule' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            List
                        </button>
                    </div>

                    {/* Desktop-only header Add button */}
                    <button
                        onClick={() => openCreateModal(new Date())}
                        className={`hidden md:flex px-3 py-1.5 rounded-lg text-sm font-bold items-center space-x-2 transition-all active:scale-95 shadow-sm ${isAdmin
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        <span>{isAdmin ? 'Add for Employee' : 'Add Availability'}</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid View */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-auto relative hidden md:block`}
            >
                <div className="min-w-[1000px] flex">
                    {/* Time Column */}
                    <div className="w-16 flex-shrink-0 border-r border-slate-100 bg-slate-50/50">
                        <div className="h-14 border-b border-slate-100" /> {/* Spacer for header */}
                        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
                            const hour = START_HOUR + i;
                            return (
                                <div key={hour} className="h-[60px] relative">
                                    <span className="absolute -top-3 right-2 text-[10px] font-bold text-slate-400 tabular-nums">
                                        {hour}:00
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Days Grid */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {weekDates.map((date, i) => {
                            const isToday = date.toDateString() === new Date().toDateString();

                            return (
                                <div key={i} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-blue-50/10' : ''}`}>
                                    {/* Header */}
                                    <div className="h-14 p-2 text-center border-b border-slate-100 bg-white sticky top-0 z-20">
                                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                                            {date.toLocaleDateString('de-CH', { weekday: 'short' })}
                                        </p>
                                        <p className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                                            {date.getDate()}
                                        </p>
                                    </div>

                                    {/* Cell Grid Lines */}
                                    <div
                                        className="relative cursor-crosshair"
                                        style={{ height: (END_HOUR - START_HOUR + 1) * ROW_HEIGHT }}
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const y = e.clientY - rect.top;
                                            const clickedHour = Math.floor(y / ROW_HEIGHT) + START_HOUR;
                                            const clickedMinutes = Math.floor((y % ROW_HEIGHT) / (ROW_HEIGHT / 4)) * 15;
                                            const d = new Date(date);
                                            d.setHours(clickedHour, clickedMinutes, 0, 0);
                                            openCreateModal(d);
                                        }}
                                    >
                                        {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, j) => (
                                            <div key={j} className="h-[60px] border-b border-slate-100/50" />
                                        ))}

                                        {/* Current Time Indicator */}
                                        {isToday && (
                                            <div
                                                className="absolute w-full border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                                                style={{ top: getMinuteOffset(new Date().toISOString()) }}
                                            >
                                                <div className="w-2 h-2 bg-red-500 rounded-full -ml-1 transition-all shadow-sm" />
                                            </div>
                                        )}

                                        {/* Blocks */}
                                        {initialBlocks
                                            .filter(block => {
                                                const blockDate = new Date(block.start_time)
                                                return blockDate.toDateString() === date.toDateString()
                                            })
                                            .map(block => {
                                                const top = getMinuteOffset(block.start_time);
                                                const height = getDurationHeight(block.start_time, block.end_time);

                                                return (
                                                    <div
                                                        key={block.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openDetailModal(block);
                                                        }}
                                                        className={`absolute left-1 right-1 rounded-md p-2 text-[10px] overflow-hidden shadow-sm border overflow-y-auto transition-all hover:ring-2 hover:ring-offset-1 z-10 cursor-pointer ${isAdmin
                                                            ? 'bg-white border-slate-200 hover:ring-blue-400'
                                                            : 'bg-teal-50 border-teal-100 text-teal-800 hover:ring-teal-400'
                                                            }`}
                                                        style={{
                                                            top,
                                                            height: Math.max(height, 24),
                                                        }}
                                                    >
                                                        <div className="font-bold truncate">{block.title}</div>
                                                        <div className="opacity-70 font-medium whitespace-nowrap">
                                                            {new Date(block.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} - {new Date(block.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {isAdmin && block.profiles && (
                                                            <div className="mt-1 font-bold text-blue-600 border-t border-slate-100/50 pt-1">
                                                                👤 {block.profiles.name}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* List/Schedule View — always visible on mobile */}
            <div className="flex-1 overflow-auto bg-white md:hidden">
                <div className="flex flex-col">
                    {weekDates.map((date, i) => {
                        const dayBlocks = sortedBlocksByDay[date.toDateString()] || []
                        const isToday = date.toDateString() === new Date().toDateString()
                        const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
                        const formattedDate = date.toLocaleDateString('en-US', options).replace(',', '');

                        return (
                            <div key={i} className="border-b border-slate-100 last:border-0 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-baseline space-x-2">
                                        <h3 className={`text-sm font-bold tracking-tight ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                                            {isToday ? `Today, ${formattedDate}` : formattedDate}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => openCreateModal(date)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 active:scale-95"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {dayBlocks.length > 0 ? (
                                        dayBlocks.map(block => (
                                            <div
                                                key={block.id}
                                                onClick={() => openDetailModal(block)}
                                                className="group relative pl-4 pr-2 flex flex-col cursor-pointer active:bg-slate-50 transition-colors"
                                            >
                                                {/* Vertical Indicator Line */}
                                                <div className={`absolute left-0 top-0.5 bottom-0.5 w-1 rounded-full ${isAdmin ? 'bg-blue-600' : 'bg-teal-500'}`} />

                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                                                        {new Date(block.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-xs font-medium text-slate-800 truncate">
                                                        {block.title}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-medium pl-10 -mt-0.5">
                                                    {new Date(block.start_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })} – {new Date(block.end_time).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
                                                    {isAdmin && block.profiles && (
                                                        <span className="ml-2 text-blue-600 font-bold opacity-80">
                                                            • {block.profiles.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="pl-4">
                                            <p className="text-sm text-slate-700">No events today</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900">Add Availability</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                                    {error}
                                </div>
                            )}

                            {isOverlapping && (
                                <div className="p-3 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Warning: This timeslot overlaps with an existing entry!
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-700 block">Title (e.g. "Available for duty")</label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all outline-none"
                                    placeholder="Morning Shift"
                                />
                            </div>

                            {isAdmin && (
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">Employee</label>
                                    <select
                                        value={targetUserId}
                                        onChange={(e) => setTargetUserId(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">Start Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">End Date/Time</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold rounded-lg shadow-md transition-all active:scale-[0.98] mt-4"
                            >
                                {isSubmitting ? 'Creating...' : 'Save Availability'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Detail Modal */}
            {isDetailModalOpen && selectedBlock && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Info className="w-5 h-5 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Edit Block' : 'Block Details'}</h3>
                            </div>
                            <button onClick={() => { setIsDetailModalOpen(false); setIsEditing(false); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {detailError && (
                            <div className="mx-5 mt-4 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                                {detailError}
                            </div>
                        )}

                        {isEditing ? (
                            <form onSubmit={handleUpdate} className="p-5 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-700 block">Title</label>
                                    <input
                                        type="text" required value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full h-10 px-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">Start</label>
                                        <input
                                            type="datetime-local" required value={editStartTime}
                                            onChange={e => setEditStartTime(e.target.value)}
                                            className="w-full h-10 px-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-700 block">End</label>
                                        <input
                                            type="datetime-local" required value={editEndTime}
                                            onChange={e => setEditEndTime(e.target.value)}
                                            className="w-full h-10 px-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-3 pt-2">
                                    <button type="button" onClick={() => setIsEditing(false)}
                                        className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={isSubmitting}
                                        className="flex-1 py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 disabled:bg-slate-300 transition-colors text-sm">
                                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className="p-5 space-y-5">
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Title</p>
                                        <p className="text-lg font-bold text-slate-900">{selectedBlock.title}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2 text-slate-400">
                                                <ClockIcon className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Start</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {new Date(selectedBlock.start_time).toLocaleString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center space-x-2 text-slate-400">
                                                <ClockIcon className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">End</span>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {new Date(selectedBlock.end_time).toLocaleString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1 pt-4 border-t border-slate-100">
                                        <div className="flex items-center space-x-2 text-slate-400">
                                            <User className="w-4 h-4" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Assigned to</span>
                                        </div>
                                        <p className="text-sm font-bold text-blue-600">{selectedBlock.profiles?.name || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50 border-t border-slate-100 flex space-x-3">
                                    {canEditBlock(selectedBlock) && (
                                        <>
                                            <button onClick={startEditing}
                                                className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors text-sm flex items-center justify-center space-x-2">
                                                <Pencil className="w-4 h-4" /><span>Edit</span>
                                            </button>
                                            <button onClick={handleDelete} disabled={isDeleting}
                                                className="py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-slate-300 transition-colors text-sm flex items-center justify-center space-x-2">
                                                <Trash2 className="w-4 h-4" /><span>{isDeleting ? '...' : 'Delete'}</span>
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => setIsDetailModalOpen(false)}
                                        className={`${canEditBlock(selectedBlock) ? '' : 'flex-1'} py-2.5 px-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors text-sm`}>
                                        Close
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Floating Add Button — Mobile only */}
            <button
                onClick={() => openCreateModal(new Date())}
                className={`md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90 ${isAdmin
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                    }`}
            >
                <Plus className="w-7 h-7" />
            </button>
        </div>
    )
}
