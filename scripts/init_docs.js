const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const [k, v] = line.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
}, {});

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Testing creation of tables via SQL...');
    try {
        const { error: fError } = await s.rpc('exec_sql', {
            query: `
            CREATE TABLE IF NOT EXISTS public.document_folders (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            `
        });
        if (fError) {
            console.error('Failed to create document_folders table via rpc exec_sql. Will ignore if error is "Could not find the function".', fError.message);
        } else {
            console.log('Created document_folders');
        }

        const { error: dError } = await s.rpc('exec_sql', {
            query: `
            CREATE TABLE IF NOT EXISTS public.documents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                folder_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
                file_path TEXT NOT NULL,
                size_bytes BIGINT NOT NULL,
                mime_type TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            `
        });
        if (dError) {
            console.error('Failed to create documents table via rpc exec_sql.', dError.message);
        } else {
            console.log('Created documents');
        }

        console.log('Creating storage bucket...');
        const { data, error: bucketError } = await s.storage.createBucket('documents', {
            public: false,
            allowedMimeTypes: null,
            fileSizeLimit: null
        });

        if (bucketError && !bucketError.message.includes('already exists')) {
            console.error('Bucket creation failed:', bucketError);
        } else {
            console.log('Bucket "documents" ready.');
        }

    } catch (e) {
        console.error('Fatal error setting up DB script:', e.message);
    }
}

run();
