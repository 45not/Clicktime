-- 1. Create document_folders table
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 4. Create common policies (assuming all authenticated employees can read and write documents)
CREATE POLICY "Allow authenticated full access to document_folders"
ON public.document_folders
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to documents"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Storage policies for the 'documents' bucket
-- (The bucket itself was created via script already, but ensure policies exist)
-- Note: 'storage.objects' policies
CREATE POLICY "Allow authenticated full access to documents bucket objects"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
