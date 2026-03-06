import { getDocumentContents, getFolderBreadcrumbs } from './actions'
import DocumentsClient from './DocumentsClient'
import { getUserProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
    await getUserProfile()
    const sp = await searchParams
    const folderId = sp.folder || null

    const { folders, files } = await getDocumentContents(folderId)
    const breadcrumbs = folderId ? await getFolderBreadcrumbs(folderId) : []

    return (
        <div className="min-h-screen bg-slate-50">
            <DocumentsClient
                initialFolders={folders}
                initialFiles={files}
                currentFolderId={folderId}
                breadcrumbs={breadcrumbs}
            />
        </div>
    )
}
