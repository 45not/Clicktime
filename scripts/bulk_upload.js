const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0) {
        const k = line.slice(0, eqIdx).trim();
        const v = line.slice(eqIdx + 1).trim();
        acc[k] = v;
    }
    return acc;
}, {});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const MIME_MAP = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
};

function getMime(filename) {
    return MIME_MAP[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

function norm(name) {
    return name.normalize('NFC').replace(/[?#%&{}\[\]<>*!$':@+`|=\\]/g, '_').trim();
}

function uploadToStorage(storageKey, buf, mimeType) {
    return new Promise((resolve, reject) => {
        const urlPath = `/storage/v1/object/documents/${encodeURIComponent(storageKey)}`;
        const options = {
            hostname: `${PROJECT_REF}.supabase.co`,
            path: urlPath,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': mimeType,
                'Content-Length': buf.length,
                'x-upsert': 'true'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true });
                else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.write(buf);
        req.end();
    });
}

const SOURCE_FOLDER = process.argv[2] || 'C:\\Users\\user\\Clicktime\\Pflegedocumenten';
const ROOT_NAME = process.argv[3] || 'Pflegedocumenten';

if (!fs.existsSync(SOURCE_FOLDER)) {
    console.error('Source folder not found:', SOURCE_FOLDER);
    process.exit(1);
}

let total = 0, done = 0, failed = 0;
function countFiles(dir) {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (item.name.startsWith('.') || item.name === '__MACOSX') continue;
        if (item.isDirectory()) countFiles(path.join(dir, item.name));
        else total++;
    }
}
countFiles(SOURCE_FOLDER);
console.log(`Files to upload: ${total}`);

async function loadExistingData() {
    const { data: fData, error: fErr } = await supabase.from('document_folders').select('id, name, parent_id');
    if (fErr) throw new Error('Could not load folders: ' + fErr.message);
    const fMap = new Map();
    for (const f of fData) fMap.set(`${f.parent_id || 'null'}:${f.name}`, f.id);

    const { data: docData, error: docErr } = await supabase.from('documents').select('file_name, folder_id');
    if (docErr) throw new Error('Could not load documents: ' + docErr.message);
    const docSet = new Set();
    for (const d of docData) docSet.add(`${d.folder_id || 'null'}:${d.file_name}`);

    return { fMap, docSet };
}

async function ensureFolder(name, parentId, existingMap) {
    const key = `${parentId || 'null'}:${norm(name)}`;
    if (existingMap.has(key)) return existingMap.get(key);

    // Using corrected field names: name, parent_id, created_by
    const { data, error } = await supabase
        .from('document_folders')
        .insert({ name: norm(name), parent_id: parentId, created_by: null })
        .select('id').single();

    if (error) throw new Error(`Folder "${name}": ${error.message}`);
    existingMap.set(key, data.id);
    return data.id;
}

async function uploadFile(filePath, folderId, existingDocs) {
    const filename = path.basename(filePath);
    const normalizedName = norm(filename);

    // Check if exists
    if (existingDocs.has(`${folderId || 'null'}:${normalizedName}`)) {
        return 'skipped';
    }

    const storageKey = `bulk/${crypto.randomUUID()}${path.extname(filename).toLowerCase()}`;
    const mimeType = getMime(filename);
    const buf = fs.readFileSync(filePath);

    await uploadToStorage(storageKey, buf, mimeType);

    // Using corrected field names: file_name, folder_id, storage_path, file_size_bytes, mime_type, uploaded_by
    const docPayload = {
        file_name: normalizedName,
        folder_id: folderId,
        storage_path: storageKey,
        file_size_bytes: buf.length,
        mime_type: mimeType,
        uploaded_by: null
    };

    const { error: dbErr } = await supabase.from('documents').insert(docPayload);
    if (dbErr) throw new Error(`DB: ${dbErr.message}`);
    return 'done';
}

async function processDir(dirPath, parentId, existingMap) {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (item.name.startsWith('.') || item.name === '__MACOSX') continue;
        const fullPath = path.join(dirPath, item.name);

        if (item.isDirectory()) {
            console.log(`  📁 ${item.name}`);
            try {
                const fId = await ensureFolder(item.name, parentId, existingMap.fMap);
                await processDir(fullPath, fId, existingMap);
            } catch (e) {
                console.error(`  ❌ FOLDER "${item.name}": ${e.message}`);
            }
        } else {
            const pct = Math.round(((done + failed) / Math.max(1, total)) * 100);
            process.stdout.write(`  [${pct}%] ${item.name}...`);
            try {
                const res = await uploadFile(fullPath, parentId, existingMap.docSet);
                if (res === 'skipped') {
                    process.stdout.write(' (exists, skipping) ⏭️\n');
                } else {
                    done++;
                    process.stdout.write(' ✅\n');
                }
            } catch (e) {
                failed++;
                process.stdout.write(` ❌ ${e.message}\n`);
            }
        }
    }
}

async function main() {
    console.log('Syncing existing data from DB...');
    const { fMap, docSet } = await loadExistingData();
    const existingMap = { fMap, docSet };
    console.log(`Loaded ${fMap.size} folders and ${docSet.size} documents.`);

    const rootId = await ensureFolder(ROOT_NAME, null, existingMap.fMap);
    console.log(`Working in folder: ${ROOT_NAME} (${rootId})\n`);

    await processDir(SOURCE_FOLDER, rootId, existingMap);

    console.log(`\n✅ ${done}/${total} uploaded`);
    if (failed > 0) console.log(`❌ ${failed} failed`);
    else console.log('🎉 Bulk upload successful!');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
