"""Administrator-only operations; all mutations are durable and audited."""
import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from typing import Literal
from filelock import FileLock, Timeout
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel, Field
from app.config import settings
from app.database import users_collection, sessions_collection, is_mongo_online, verify_password, hash_password
from app.routers.auth import require_admin, normalize_role, issue_login_session
from app.services.admin_store import connection, audit
from app.services.corpus import BACKEND, get_corpus, data_directory, parse_metadata
from app.services.document_reader import MAX_UPLOAD_BYTES, read_document
from app.services.gemini_service import generate, GenerationUnavailable
from app.routers.analysis import STORE

router = APIRouter(prefix='/admin', tags=['Administration'], dependencies=[Depends(require_admin)])
EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix='standards-index')
JOB_LOCK = Lock()
USER_LOCK = FileLock(str(BACKEND / 'data' / 'admin-users.lock'), timeout=15)
INDEX_LOCK = FileLock(str(BACKEND / 'data' / 'admin-index.lock'), thread_local=False)
ARCHIVE = BACKEND / 'data' / 'standards-archive'

class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    department: str | None = Field(default=None, max_length=160)
    role: Literal['Administrator', 'Procurement Officer'] | None = None
    status: Literal['active', 'deactivated'] | None = None

class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)

def user_view(user):
    return {'id':user['id'], 'name':user['full_name'], 'email':user['email'],
            'department':user.get('department',''), 'role':normalize_role(user.get('role')),
            'status':user.get('status','active'), 'email_verified':bool(user.get('is_email_verified')),
            'created_at':str(user.get('created_at','')), 'last_login_at':str(user.get('last_login_at',''))}

def page(items, offset, limit):
    return {'items':items[offset:offset+limit], 'total':len(items), 'offset':offset, 'limit':limit}

def analyses():
    records=[]
    for path in STORE.glob('analysis-*.json'):
        try:
            record=json.loads(path.read_text(encoding='utf-8')); data=record['data']
            records.append({'id':data['id'], 'owner':record['owner'], 'product':data['extracted']['product_name'],
                            'created_at':data['extracted']['extracted_at'], 'status':data['status'],
                            'recommendations':len(data['recommendations']), 'generation_mode':data.get('generation_mode','unknown')})
        except (ValueError, KeyError, OSError): continue
    return sorted(records,key=lambda r:r['created_at'],reverse=True)

@router.get('/overview')
def overview():
    users=list(users_collection.find({}))
    files=[p for p in data_directory().glob('*') if p.suffix.lower() in {'.pdf','.docx','.txt'}]
    return {'users':len(users), 'active_users':sum(u.get('status')=='active' for u in users),
            'administrators':sum(normalize_role(u.get('role'))=='Administrator' and u.get('status')=='active' for u in users),
            'documents':len(files), 'analyses':len(analyses()), 'database':'MongoDB' if is_mongo_online else 'Local persistent storage',
            'llm_configured':bool(settings.gemini_api_key), 'llm_model':settings.gemini_model,
            'semantic_enabled':settings.rag_semantic_enabled, 'embedding_model':settings.embedding_model}

@router.get('/users')
def list_users(q: str='', role: str='', status: str='', offset: int=Query(0,ge=0), limit: int=Query(20,ge=1,le=100)):
    users=[user_view(u) for u in users_collection.find({})]
    filtered=[u for u in users if (not q or q.lower() in (u['name']+' '+u['email']+' '+u['department']).lower())
              and (not role or u['role']==role) and (not status or u['status']==status)]
    return page(sorted(filtered,key=lambda u:u['created_at'],reverse=True),offset,limit)

@router.patch('/users/{user_id}')
def update_user(user_id: str, change: UserUpdate, actor=Depends(require_admin)):
    with USER_LOCK:
        user=users_collection.find_one({'id':user_id})
        if not user: raise HTTPException(404,'User not found.')
        if actor['id']==user_id and (change.status=='deactivated' or change.role=='Procurement Officer'):
            raise HTTPException(409,'You cannot deactivate or demote your own administrator account.')
        if normalize_role(user.get('role'))=='Administrator' and (change.status=='deactivated' or change.role=='Procurement Officer'):
            remaining=[u for u in users_collection.find({}) if u['id']!=user_id and u.get('status')=='active' and normalize_role(u.get('role'))=='Administrator']
            if not remaining: raise HTTPException(409,'At least one active administrator must remain.')
        if change.role=='Administrator' and not user.get('is_email_verified'):
            raise HTTPException(409,'Verify this user’s email before granting administrator access.')
        fields=change.model_dump(exclude_none=True)
        if 'name' in fields: fields['full_name']=fields.pop('name').strip()
        if fields.get('full_name')=='': raise HTTPException(422,'Name is required.')
        fields['updated_at']=datetime.now(timezone.utc).isoformat()
        users_collection.update_one({'id':user_id},{'$set':fields})
        if (change.role is not None and change.role != normalize_role(user.get('role'))) or (change.status is not None and change.status != user.get('status')):
            sessions_collection.update_many({'user_id':user_id},{'$set':{'revoked':True}})
        audit(actor['id'],'user.update',user_id,change.model_dump(exclude_none=True))
        return user_view(users_collection.find_one({'id':user_id}))

@router.post('/users/{user_id}/revoke-sessions')
def revoke_sessions(user_id: str, actor=Depends(require_admin)):
    if not users_collection.find_one({'id':user_id}): raise HTTPException(404,'User not found.')
    sessions_collection.update_many({'user_id':user_id},{'$set':{'revoked':True}})
    audit(actor['id'],'sessions.revoke',user_id)
    return {'success':True}

@router.post('/password')
def change_password(change: PasswordChange, actor=Depends(require_admin)):
    if not actor.get('password_hash') or not verify_password(change.current_password,actor['password_hash'],actor['salt']):
        raise HTTPException(400,'Current password is incorrect.')
    if change.current_password==change.new_password: raise HTTPException(422,'Choose a different new password.')
    hashed,salt=hash_password(change.new_password)
    users_collection.update_one({'id':actor['id']},{'$set':{'password_hash':hashed,'salt':salt,'updated_at':datetime.now(timezone.utc).isoformat()}})
    sessions_collection.update_many({'user_id':actor['id']},{'$set':{'revoked':True}})
    token=issue_login_session(actor['id'])
    audit(actor['id'],'password.change',actor['id'])
    return {'success':True,'access_token':token}

@router.get('/analyses')
def list_analyses(q: str='', offset: int=Query(0,ge=0), limit: int=Query(20,ge=1,le=100)):
    return page([r for r in analyses() if q.lower() in (r['product']+' '+r['owner']).lower()],offset,limit)

@router.get('/audit')
def list_audit(offset: int=Query(0,ge=0), limit: int=Query(30,ge=1,le=100)):
    with connection() as db:
        items=[dict(r) for r in db.execute('SELECT id,at,actor,action,target,details FROM audit ORDER BY id DESC LIMIT ? OFFSET ?',(limit,offset))]
        total=db.execute('SELECT COUNT(*) FROM audit').fetchone()[0]
    return {'items':items,'total':total,'offset':offset,'limit':limit}

@router.get('/standards')
def standard_files():
    try:
        corpus=get_corpus()
        indexed={d['source']:d for d in corpus.documents}
        report=corpus.report()
    except (ValueError, OSError):
        indexed={}
        report={'documents':0,'chunks':0,'ocr_pages':0,'retrieval_mode':'unavailable',
                'errors':[{'error':'No usable index. Add or restore a readable document, then rebuild.'}], 'pages_needing_ocr':[]}
    files=[]
    for directory, status in [(data_directory(),'indexed'),(ARCHIVE,'archived')]:
        for path in sorted(directory.glob('*')):
            if path.suffix.lower() not in {'.pdf','.docx','.txt'}: continue
            meta=indexed.get(path.name,{}) if status=='indexed' else {}
            files.append({'filename':path.name,'status':status if meta or status=='archived' else 'error',
                          'size':path.stat().st_size,'title':meta.get('title',''), 'is_number':meta.get('is_number',''),
                          'pages':meta.get('pages',0),'ocr_pages':len(meta.get('ocr_pages',[])),
                          'amendment':meta.get('amendment',''),'id':meta.get('id','')})
    return {'items':files,'report':report}


def run_job(identifier, actor, operation=None):
    with connection() as db: db.execute('UPDATE jobs SET status=?,message=? WHERE id=?',('running','Reading documents, OCR and indexing.',identifier))
    try:
        if operation: operation()
        report=get_corpus(force=True).report()
        message = f'Index rebuilt with {len(report["errors"])} extraction errors.' if report['errors'] else 'Index rebuilt.'
        with connection() as db: db.execute('UPDATE jobs SET status=?,message=?,report=? WHERE id=?',('completed',message,json.dumps(report),identifier))
        audit(actor,'index.complete',identifier,{'documents':report['documents'],'chunks':report['chunks'],'errors':len(report['errors'])})
    except Exception as error:
        message=str(error)[:400] if isinstance(error,(ValueError,FileExistsError)) else 'Index operation failed. Check the server log and document validity.'
        with connection() as db: db.execute('UPDATE jobs SET status=?,message=? WHERE id=?',('failed',message,identifier))
        audit(actor,'index.failed',identifier,{'error_type':type(error).__name__})
    finally:
        INDEX_LOCK.release()


def start_job(actor, kind, operation=None):
    with JOB_LOCK:
        try: INDEX_LOCK.acquire(timeout=0)
        except Timeout: raise HTTPException(409,'An index operation is already running. Wait for it to finish.')
        with connection() as db:
            db.execute("UPDATE jobs SET status='failed', message='Interrupted by a server restart; retry this operation.' WHERE status IN ('queued','running')")
            identifier='job-'+uuid.uuid4().hex
            db.execute('INSERT INTO jobs VALUES(?,?,?,?,?,?,?)',(identifier,datetime.now(timezone.utc).isoformat(),actor,kind,'queued','Waiting for index worker.','{}'))
        audit(actor,'index.start',identifier,{'kind':kind})
        EXECUTOR.submit(run_job,identifier,actor,operation)
        return {'id':identifier,'status':'queued'}

@router.post('/index/rebuild',status_code=202)
def rebuild(actor=Depends(require_admin)):
    return start_job(actor['id'],'rebuild')

@router.get('/jobs')
def list_jobs():
    if not INDEX_LOCK.is_locked:
        try:
            INDEX_LOCK.acquire(timeout=0)
        except Timeout:
            pass
        else:
            try:
                with connection() as db:
                    db.execute("UPDATE jobs SET status='failed', message='Interrupted by a server restart; retry this operation.' WHERE status IN ('queued','running')")
            finally: INDEX_LOCK.release()
    with connection() as db: return [dict(r) for r in db.execute('SELECT * FROM jobs ORDER BY at DESC LIMIT 20')]

@router.post('/standards/upload',status_code=202)
def upload_standard(file: UploadFile=File(...),actor=Depends(require_admin)):
    filename=file.filename or ''
    if Path(filename).name!=filename or not re.fullmatch(r'[A-Za-z0-9_. -]+\.(pdf|docx|txt)',filename,re.I):
        raise HTTPException(422,'Use a plain filename containing the IS number, part and year, such as is.2925.1984.pdf.')
    try: parse_metadata(filename)
    except ValueError as error: raise HTTPException(422,str(error))
    content=file.file.read(MAX_UPLOAD_BYTES+1)
    if not content or len(content)>MAX_UPLOAD_BYTES: raise HTTPException(422,'Upload a nonempty document up to 20 MB.')
    target=data_directory()/filename
    if target.exists() or (ARCHIVE/filename).exists(): raise HTTPException(409,'A document with this filename already exists.')
    def operation():
        read_document(content,filename)  # Validate before adding to the searchable corpus.
        target.parent.mkdir(parents=True,exist_ok=True)
        with target.open('xb') as output: output.write(content)
        audit(actor['id'],'document.upload',filename)
    return start_job(actor['id'],'upload '+filename,operation)

@router.post('/standards/{filename}/archive',status_code=202)
def archive_standard(filename: str,actor=Depends(require_admin)):
    source=data_directory()/filename
    if Path(filename).name!=filename or not source.is_file(): raise HTTPException(404,'Document not found.')
    if len([p for p in data_directory().iterdir() if p.suffix.lower() in {'.pdf','.txt','.docx'}])<=1:
        raise HTTPException(409,'Keep at least one source document in the corpus.')
    def operation():
        ARCHIVE.mkdir(parents=True,exist_ok=True)
        if (ARCHIVE/filename).exists(): raise FileExistsError('An archived file already has this name.')
        source.rename(ARCHIVE/filename)
        audit(actor['id'],'document.archive',filename)
    return start_job(actor['id'],'archive '+filename,operation)

@router.post('/standards/{filename}/restore',status_code=202)
def restore_standard(filename: str,actor=Depends(require_admin)):
    source=ARCHIVE/filename
    if Path(filename).name!=filename or not source.is_file(): raise HTTPException(404,'Archived document not found.')
    def operation():
        target=data_directory()/filename
        if target.exists(): raise FileExistsError('An active file already has this name.')
        source.rename(target)
        audit(actor['id'],'document.restore',filename)
    return start_job(actor['id'],'restore '+filename,operation)

@router.post('/health/llm')
def test_llm(actor=Depends(require_admin)):
    try:
        result=generate('Return only the word OK.',{})
        status='available' if result.strip()=='OK' else 'responding'
    except GenerationUnavailable as error:
        status='unavailable'
        result=str(error)
    audit(actor['id'],'health.llm',settings.gemini_model,{'status':status})
    return {'status':status,'model':settings.gemini_model,'message':result[:200]}
