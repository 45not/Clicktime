'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/auth'

export interface DocumentFolder {
    id: string
    name: string
    parent_id: string | null
    created_by: string | null
    created_at: string
}

export interface DocumentFile {
    id: string
    folder_id: string | null
    file_name: string
    storage_path: string
    file_size_bytes: number
    mime_type: string | null
    uploaded_by: string | null
    created_at: string
}

export async function getDocumentContents(folderId: string | null = null) {
    await getUserProfile()
    const supabase = await createClient()

    let folderQuery = supabase.from('document_folders').select('*').order('name')
    if (folderId) {
        folderQuery = folderQuery.eq('parent_id', folderId)
    } else {
        folderQuery = folderQuery.is('parent_id', null)
    }

    let fileQuery = supabase.from('documents').select('*').order('file_name')
    if (folderId) {
        fileQuery = fileQuery.eq('folder_id', folderId)
    } else {
        fileQuery = fileQuery.is('folder_id', null)
    }

    const [foldersRes, filesRes] = await Promise.all([folderQuery, fileQuery])

    if (foldersRes.error) console.error('Error fetching folders:', foldersRes.error)
    if (filesRes.error) console.error('Error fetching files:', filesRes.error)

    return {
        folders: (foldersRes.data || []) as DocumentFolder[],
        files: (filesRes.data || []) as DocumentFile[]
    }
}

export async function createFolder(name: string, parentId: string | null = null) {
    const profile = await getUserProfile()
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('document_folders')
        .insert({
            name,
            parent_id: parentId,
            created_by: profile.id
        })
        .select()
        .single()

    if (error) {
        return { error: error.message }
    }
    return { data }
}

export async function deleteFolder(id: string) {
    await getUserProfile()
    const supabase = await createClient()
    const { error } = await supabase.from('document_folders').delete().eq('id', id)
    if (error) {
        return { error: error.message }
    }
    return { success: true }
}

export async function deleteFile(id: string, filePath: string) {
    await getUserProfile()
    const supabase = await createClient()

    // Delete from storage first
    const { error: storageError } = await supabase.storage.from('documents').remove([filePath])
    if (storageError) {
        console.error('Storage deletion error:', storageError)
    }

    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
        return { error: error.message }
    }
    return { success: true }
}

export async function getFolderBreadcrumbs(targetFolderId: string): Promise<{ id: string, name: string }[]> {
    await getUserProfile()
    const supabase = await createClient()

    // We can fetch all folders and map them in memory instead of heavy recursive SQL since there won't be millions of folders
    const { data: allFolders } = await supabase.from('document_folders').select('id, name, parent_id')
    if (!allFolders) return []

    const breadcrumbs = []
    let currentId: string | null = targetFolderId
    while (currentId) {
        const folder = allFolders.find(f => f.id === currentId)
        if (folder) {
            breadcrumbs.unshift({ id: folder.id, name: folder.name })
            currentId = folder.parent_id
        } else {
            currentId = null
        }
    }
    return breadcrumbs
}

export async function getSignedUrl(filePath: string) {
    await getUserProfile()
    const supabase = await createClient()
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(filePath, 3600) // 1 hour
    if (error) {
        return { error: error.message }
    }
    return { url: data.signedUrl }
}
