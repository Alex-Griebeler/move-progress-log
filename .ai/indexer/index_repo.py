#!/usr/bin/env python3
'''
RAG Indexer: varre src/** e supabase/functions/** e faz upsert de
chunks + embeddings no Supabase. Atualiza de forma incremental por hash.

Uso:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... python3 index_repo.py
'''
import os, hashlib, pathlib, json, urllib.request, urllib.error

SUPABASE_URL      = os.environ['SUPABASE_URL']
SUPABASE_SVC_KEY  = os.environ['SUPABASE_SERVICE_ROLE_KEY']
OPENAI_API_KEY    = os.environ.get('OPENAI_API_KEY', '')
CHUNK_SIZE        = 1500
OVERLAP           = 200
SCAN_DIRS         = ['src', 'supabase/functions']
EXTENSIONS        = {'.ts', '.tsx', '.sql', '.py', '.md'}
HDR = { 'apikey': SUPABASE_SVC_KEY, 'Authorization': 'Bearer ' + SUPABASE_SVC_KEY, 'Content-Type': 'application/json' }

def sb(method, path, data=None, extra=None):
    url  = SUPABASE_URL + '/rest/v1/' + path
    hdrs = {**HDR, **(extra or {})}
    body = json.dumps(data).encode() if data else None
    req  = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(str(e.code) + ': ' + e.read().decode())

def chunks(text):
    out, i = [], 0
    while i < len(text):
        out.append(text[i:i+CHUNK_SIZE])
        i += CHUNK_SIZE - OVERLAP
    return out

def embed(text):
    if not OPENAI_API_KEY: return None
    req = urllib.request.Request('https://api.openai.com/v1/embeddings',
        data=json.dumps({'model':'text-embedding-3-small','input':text}).encode(),
        headers={'Authorization':'Bearer '+OPENAI_API_KEY,'Content-Type':'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())['data'][0]['embedding']

def main():
    root = pathlib.Path(__file__).parent.parent.parent
    existing = {r['path']+'::'+str(r['chunk_index']): r['hash']
                for r in sb('GET','ai_code_documents?select=path,chunk_index,hash') or []}
    indexed = skipped = 0
    for d in SCAN_DIRS:
        base = root / d
        if not base.exists(): continue
        for fp in base.rglob('*'):
            if fp.suffix not in EXTENSIONS or 'node_modules' in fp.parts: continue
            try: content = fp.read_text(encoding='utf-8', errors='ignore')
            except: continue
            rel = str(fp.relative_to(root))
            for i, chunk in enumerate(chunks(content)):
                h   = hashlib.sha256(chunk.encode()).hexdigest()
                key = rel + '::' + str(i)
                if existing.get(key) == h: skipped += 1; continue
                rows = sb('POST','ai_code_documents',{'path':rel,'content':chunk,'hash':h,'chunk_index':i},
                          {'Prefer':'resolution=merge-duplicates,return=representation'})
                doc_id = rows[0]['id']
                emb = embed(chunk)
                if emb:
                    sb('DELETE', 'ai_code_embeddings?document_id=eq.' + doc_id)
                    sb('POST','ai_code_embeddings',{'document_id':doc_id,'embedding':emb})
                indexed += 1
                print('indexed:', rel, 'chunk', i)
    print('Done. Indexed:', indexed, '| Skipped:', skipped)

if __name__ == '__main__':
    main()
