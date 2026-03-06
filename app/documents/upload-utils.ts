import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/client'

export type UploadProgress = {
    total: number
    completed: number
    failed: number
    currentFile: string
    errors: string[]
}

export type ProgressCallback = (progress: UploadProgress) => void

// Helper to normalize strings to NFC and remove characters that might break Storage or URLs
export function normalizeFilename(name: string): string {
    let normalized = name.normalize('NFC')
    // Remove characters like ?, #, %, &, {, }, \, <, >, *, ?, $, !, ', ", :, @, +, `, |, =
    normalized = normalized.replace(/[?#%&{}\\[\]<>*!$':@+`|=]/g, '_')
    return normalized
}

export async function processZipUpload(
    file: File,
    parentFolderId: string | null,
    onProgress: ProgressCallback
) {
    const supabase = createClient()
    const zip = new JSZip()
    const contents = await zip.loadAsync(file)

    const entries = Object.values(contents.files).filter(entry =>
        !entry.name.includes('__MACOSX/') && !entry.name.startsWith('.')
    )

    // Sort entries so folders come before files, and shallower paths come before deeper paths
    entries.sort((a, b) => a.name.length - b.name.length)

    let progress: UploadProgress = {
        total: entries.filter(e => !e.dir).length,
        completed: 0,
        failed: 0,
        currentFile: '',
        errors: []
    }

    onProgress(progress)

    // A map from relative zip path to DB folder_id 
    const folderIdMap = new Map<string, string | null>()
    // Start with the current directory
    folderIdMap.set('', parentFolderId)

    // Determine root folder. Sometimes zips have a root folder already.
    // If we want to ensure everything goes into "Pflegedocumenten", we handle it here.
    // The requirement says "ensure root folder becomes Pflegedocumenten (or ask user to name it)".
    // A simple way is to just wrap the whole zip in a new folder named after the zip file, minus .zip
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id || null

    const defaultRootName = file.name.replace(/\.zip$/i, '')
    let actualRootId = parentFolderId
    const { data: rootFolder, error: rootError } = await supabase
        .from('document_folders')
        .insert({
            name: defaultRootName,
            parent_id: parentFolderId,
            created_by: userId
        })
        .select()
        .single()

    if (rootError) {
        progress.errors.push(`Note: Could not create wrapper folder '${defaultRootName}'. Extracting directly into current folder. (${rootError.message})`)
        onProgress({ ...progress })
    } else {
        actualRootId = rootFolder.id
    }

    folderIdMap.set('', actualRootId)

    for (const entry of entries) {
        // e.g. "Folder/Sub/File.txt"
        // remove trailing slashes from dirs
        const cleanPath = entry.name.endsWith('/') ? entry.name.slice(0, -1) : entry.name
        const parts = cleanPath.split('/')
        const name = parts.pop() || ''
        const parentPath = parts.join('/')

        const currentParentId = folderIdMap.get(parentPath) || actualRootId

        if (entry.dir) {
            // Create folder
            const { data: newFolder, error: fError } = await supabase
                .from('document_folders')
                .insert({
                    name: normalizeFilename(name),
                    parent_id: currentParentId,
                    created_by: userId
                })
                .select()
                .single()

            if (fError) {
                progress.errors.push(`Folder ${name}: ${fError.message}`)
            } else {
                folderIdMap.set(cleanPath, newFolder.id)
            }
            onProgress({ ...progress })
        } else {
            // It's a file
            progress.currentFile = name
            onProgress({ ...progress })

            try {
                const blob = await entry.async('blob')
                const ext = name.split('.').pop() || ''
                // Standardize mime type generic if unknown
                const mimeType = blob.type || 'application/octet-stream'

                const normalizedFileName = normalizeFilename(name)
                // Use a combination of uuid and filename to ensure unique storage paths
                const storagePath = `${crypto.randomUUID()}-${normalizedFileName}`

                // Upload to bucket
                const { error: uploadError } = await supabase.storage
                    .from('documents')
                    .upload(storagePath, blob, { contentType: mimeType, upsert: false })

                if (uploadError) throw new Error(uploadError.message)

                // Insert to DB
                const { error: dbError } = await supabase
                    .from('documents')
                    .insert({
                        file_name: normalizedFileName,
                        folder_id: currentParentId,
                        storage_path: storagePath,
                        file_size_bytes: blob.size,
                        mime_type: mimeType,
                        uploaded_by: userId
                    })

                if (dbError) throw new Error(dbError.message)

                progress.completed++
            } catch (err: any) {
                progress.failed++
                progress.errors.push(`${name}: ${err.message}`)
            }
            onProgress({ ...progress })
        }
    }
}

export async function processStandardUploads(
    files: File[],
    parentFolderId: string | null,
    onProgress: ProgressCallback
) {
    const supabase = createClient()

    let progress: UploadProgress = {
        total: files.length,
        completed: 0,
        failed: 0,
        currentFile: '',
        errors: []
    }
    onProgress(progress)

    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id || null

    for (const file of files) {
        progress.currentFile = file.name
        onProgress({ ...progress })

        try {
            // WebKitDirectory might give us paths like "MyFolder/Sub/file.txt" in file.webkitRelativePath
            // If it exists, we could recreate folders. For now, we'll implement simple flat upload if not a zip,
            // or we parse webkitRelativePath.
            // But we will stick to basic flat files for "Upload File" unless parsing webkit.

            const normalizedFileName = normalizeFilename(file.name)
            const storagePath = `${crypto.randomUUID()}-${normalizedFileName}`

            const { error: uploadErr } = await supabase.storage
                .from('documents')
                .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' })

            if (uploadErr) throw new Error(uploadErr.message)

            const { error: dbErr } = await supabase
                .from('documents')
                .insert({
                    file_name: normalizedFileName,
                    folder_id: parentFolderId,
                    storage_path: storagePath,
                    file_size_bytes: file.size,
                    mime_type: file.type || null,
                    uploaded_by: userId
                })

            if (dbErr) throw new Error(dbErr.message)

            progress.completed++
        } catch (err: any) {
            progress.failed++
            progress.errors.push(`${file.name}: ${err.message}`)
        }
        onProgress({ ...progress })
    }
}
