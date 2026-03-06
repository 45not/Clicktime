'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentFolder, DocumentFile, createFolder, deleteFolder, deleteFile, getSignedUrl } from './actions'
import { processZipUpload, processStandardUploads, UploadProgress } from './upload-utils'
import { Folder, FileText, UploadCloud, Plus, ChevronRight, X, Trash2, Home, FileArchive, Loader2, Download } from 'lucide-react'
import Link from 'next/link'

interface DocumentsClientProps {
    initialFolders: DocumentFolder[]
    initialFiles: DocumentFile[]
    currentFolderId: string | null
    breadcrumbs: { id: string, name: string }[]
}

export default function DocumentsClient({ initialFolders, initialFiles, currentFolderId, breadcrumbs }: DocumentsClientProps) {
    const router = useRouter()

    // UI state
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
    const [newFolderName, setNewFolderName] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null)

    // Upload state
    const fileInputRef = useRef<HTMLInputElement>(null)
    const zipInputRef = useRef<HTMLInputElement>(null)
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newFolderName.trim()) return
        setIsCreating(true)
        const res = await createFolder(newFolderName.trim(), currentFolderId)
        setIsCreating(false)
        if (!res.error) {
            setNewFolderName('')
            setIsCreateFolderOpen(false)
            router.refresh()
        } else {
            alert('Error creating folder: ' + res.error)
        }
    }

    const handleDeleteFolder = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete the folder "${name}" and all its contents?`)) return
        const res = await deleteFolder(id)
        if (res.error) alert('Error deleting folder: ' + res.error)
        else router.refresh()
    }

    const handleDeleteFile = async (id: string, storagePath: string, fileName: string) => {
        if (!confirm(`Are you sure you want to delete the file "${fileName}"?`)) return
        const res = await deleteFile(id, storagePath)
        if (res.error) alert('Error deleting file: ' + res.error)
        else router.refresh()
    }

    const handleDownload = async (storagePath: string, fileName: string) => {
        const res = await getSignedUrl(storagePath)
        if (res.url) {
            const a = document.createElement('a')
            a.href = res.url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } else {
            alert('Could not generate download link: ' + res.error)
        }
    }

    const handlePreview = async (file: DocumentFile) => {
        const isPdf = file.mime_type === 'application/pdf'
        const isImage = file.mime_type?.startsWith('image/')
        const isWord = file.file_name.endsWith('.docx') || file.file_name.endsWith('.doc')

        if (isPdf || isImage || isWord) {
            const result = await getSignedUrl(file.storage_path)
            if (result.url) {
                setPreviewFile(file)
                if (isWord) {
                    setPreviewUrl(`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(result.url)}`)
                } else {
                    setPreviewUrl(result.url)
                }
            } else {
                alert('Could not open preview: ' + result.error)
            }
        } else {
            handleDownload(file.storage_path, file.file_name)
        }
    }

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return

        try {
            await processStandardUploads(files, currentFolderId, (prog) => {
                setUploadProgress(prog)
            })
        } catch (err: any) {
            setUploadProgress(prev => prev ? { ...prev, errors: [...prev.errors, 'Fatal error: ' + err.message] } : null)
            alert('Upload failed: ' + err.message)
        }

        if (fileInputRef.current) fileInputRef.current.value = ''
        router.refresh()
    }

    const handleZipUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            await processZipUpload(file, currentFolderId, (prog) => {
                setUploadProgress(prog)
            })
        } catch (err: any) {
            setUploadProgress(prev => prev ? { ...prev, errors: [...prev.errors, 'Fatal ZIP error: ' + err.message] } : null)
            alert('ZIP processing failed: ' + err.message)
        }

        if (zipInputRef.current) zipInputRef.current.value = ''
        router.refresh()
    }

    const closeProgress = () => {
        setUploadProgress(null)
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100">
                            <ChevronRight className="w-5 h-5 rotate-180" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex items-center text-sm mt-2 text-slate-500 overflow-x-auto whitespace-nowrap pb-1">
                        <Link href="/documents" className="hover:text-blue-600 flex items-center">
                            <Home className="w-4 h-4 mr-1" /> Root
                        </Link>
                        {breadcrumbs.map((bc) => (
                            <div key={bc.id} className="flex items-center">
                                <ChevronRight className="w-4 h-4 mx-1" />
                                <Link href={`/documents?folder=${bc.id}`} className="hover:text-blue-600">
                                    {bc.name}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsCreateFolderOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" /> New Folder
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 text-sm font-medium"
                    >
                        <UploadCloud className="w-4 h-4" /> Upload Files
                    </button>

                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            {initialFolders.length === 0 && initialFiles.length === 0 && (
                <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
                    <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-medium text-lg">Empty Folder</h3>
                    <p className="text-slate-500 text-sm mt-1">Upload files or create a subfolder to get started.</p>
                </div>
            )}

            {(initialFolders.length > 0 || currentFolderId !== null) && (
                <div className="mb-8">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Folders</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Back Button */}
                        {currentFolderId !== null && (
                            <div
                                onClick={() => {
                                    const parentId = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
                                    router.push(parentId ? `/documents?folder=${parentId}` : '/documents');
                                }}
                                className="group flex items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-400 mr-3 rotate-180" />
                                <span className="font-medium text-slate-600 truncate">... Go Back</span>
                            </div>
                        )}

                        {initialFolders.map(folder => (
                            <div key={folder.id} className="group flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-sm transition-all">
                                <Link href={`/documents?folder=${folder.id}`} className="flex-1 flex items-center min-w-0">
                                    <Folder className="w-5 h-5 text-blue-500 mr-3 shrink-0" fill="currentColor" fillOpacity={0.2} />
                                    <span className="font-medium text-slate-700 truncate">{folder.name}</span>
                                </Link>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleDeleteFolder(folder.id, folder.name); }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {initialFiles.length > 0 && (
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Files</h2>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                            {initialFiles.map(file => (
                                <li key={file.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div
                                        className="flex-1 flex items-center min-w-0 cursor-pointer"
                                        onClick={() => handlePreview(file)}
                                    >
                                        <FileText className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                                        <div className="truncate">
                                            <p className="font-medium text-slate-700 truncate">{file.file_name}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {formatFileSize(file.file_size_bytes)} • {new Date(file.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(file.storage_path, file.file_name); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id, file.storage_path, file.file_name); }}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Create Folder Modal */}
            {isCreateFolderOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
                            <h2 className="text-lg font-bold text-slate-800">New Folder</h2>
                            <button onClick={() => setIsCreateFolderOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFolder} className="p-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Folder Name</label>
                            <input
                                type="text"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="e.g. Policies"
                                autoFocus
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateFolderOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newFolderName.trim() || isCreating}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center"
                                >
                                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewUrl && previewFile && (
                <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-sm">
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
                        <div className="flex items-center gap-3 truncate">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <span className="font-medium truncate">{previewFile.file_name}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <button
                                onClick={() => handleDownload(previewFile.storage_path, previewFile.file_name)}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white flex items-center gap-2 text-sm font-medium"
                            >
                                <Download className="w-4 h-4" /> Download
                            </button>
                            <button
                                onClick={() => { setPreviewUrl(null); setPreviewFile(null); }}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-slate-300 hover:text-red-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 md:p-8 flex items-center justify-center">
                        {previewFile.mime_type?.includes('pdf') ||
                            previewFile.mime_type?.includes('image') ||
                            previewFile.file_name.endsWith('.docx') ||
                            previewFile.file_name.endsWith('.doc') ? (
                            <iframe
                                src={previewUrl}
                                className="w-full h-full bg-white rounded-xl shadow-2xl max-w-5xl"
                                title="File Preview"
                            />
                        ) : (
                            <div className="bg-slate-800 p-8 rounded-2xl text-center max-w-md">
                                <FileText className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                                <h3 className="text-xl font-medium text-white mb-2">No Preview Available</h3>
                                <p className="text-slate-400 mb-6 text-sm">This file type cannot be previewed directly in the browser.</p>
                                <button
                                    onClick={() => handleDownload(previewFile.storage_path, previewFile.file_name)}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center"
                                >
                                    <Download className="w-5 h-5 mr-2" /> Download File
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Progress UI */}
            {uploadProgress && (
                <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            {uploadProgress.completed + uploadProgress.failed < uploadProgress.total ? (
                                <><Loader2 className="w-4 h-4 animate-spin text-blue-600 mr-2" /> Uploading...</>
                            ) : (
                                'Upload Complete'
                            )}
                        </h3>
                        {uploadProgress.completed + uploadProgress.failed === uploadProgress.total && (
                            <button onClick={closeProgress} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="p-4">
                        <div className="mb-2 flex justify-between text-sm text-slate-600 font-medium">
                            <span>{uploadProgress.completed} of {uploadProgress.total} uploaded</span>
                            {uploadProgress.failed > 0 && <span className="text-red-500">{uploadProgress.failed} failed</span>}
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative">
                            <div
                                className={`absolute left-0 top-0 bottom-0 bg-blue-500 transition-all duration-300 ${uploadProgress.failed > 0 ? 'bg-amber-500' : ''}`}
                                style={{ width: `${Math.max(5, ((uploadProgress.completed + uploadProgress.failed) / Math.max(1, uploadProgress.total)) * 100)}%` }}
                            />
                        </div>

                        {(uploadProgress.completed + uploadProgress.failed < uploadProgress.total) && (
                            <p className="text-xs text-slate-500 mt-3 truncate" title={uploadProgress.currentFile}>
                                Processing: <span className="text-slate-700 font-medium">{uploadProgress.currentFile}</span>
                            </p>
                        )}

                        {uploadProgress.errors.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100 max-h-32 overflow-y-auto custom-scrollbar">
                                <p className="text-xs font-bold text-red-600 mb-1">Errors:</p>
                                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                                    {uploadProgress.errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    )
}
