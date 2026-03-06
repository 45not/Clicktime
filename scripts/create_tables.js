const https = require('https');

// Read env
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
        const k = line.slice(0, eqIdx).trim();
        const v = line.slice(eqIdx + 1).trim();
        acc[k] = v;
    }
    return acc;
}, {});

// Extract the project ref from the URL (e.g. jryrzyhhovidxkevgqch from https://jryrzyhh...supabase.co)
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'document_folders' AND policyname = 'Allow authenticated full access to document_folders') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated full access to document_folders" ON public.document_folders FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Allow authenticated full access to documents') THEN
    EXECUTE 'CREATE POLICY "Allow authenticated full access to documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
`;

function makeRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function createTables() {
    console.log('Creating tables via Supabase Management API...');
    console.log('Project ref:', projectRef);

    const body = JSON.stringify({ query: sql });

    const options = {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${projectRef}/database/query`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    };

    const result = await makeRequest(options, body);

    if (result.status === 200 || result.status === 201) {
        console.log('✅ Tables created successfully!');
        return true;
    } else {
        console.log('Management API status:', result.status);
        console.log('Response:', JSON.stringify(result.body, null, 2));

        // Try the REST API endpoint instead (works for some Supabase versions)
        console.log('\nTrying alternative REST endpoint...');
        const options2 = {
            hostname: `${projectRef}.supabase.co`,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify({ query: sql }))
            }
        };
        const result2 = await makeRequest(options2, JSON.stringify({ query: sql }));
        console.log('Alt API status:', result2.status, JSON.stringify(result2.body).slice(0, 200));
        return false;
    }
}

createTables().then(ok => {
    if (!ok) {
        console.log('\n⚠️  Could not create tables automatically.');
        console.log('Please manually run the SQL from db_setup.sql in your Supabase Dashboard → SQL Editor.');
        console.log('https://supabase.com/dashboard/project/' + projectRef + '/editor');
    }
});
