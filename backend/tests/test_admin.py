"""Admin permission and mutation tests using isolated accounts, storage and corpus fixtures."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
sys.path.insert(0,str(Path(__file__).resolve().parent))
from test_login_sessions import database, Collection
# Extend test-only collections for administration operations.
Collection.find=lambda self,query=None,**kwargs:[copy.deepcopy(d) for d in self.docs if self.matches(d,query or {})]
def update_many(self,query,update):
    for doc in self.docs:
        if self.matches(doc,query): doc.update(update.get('$set',{}))
Collection.update_many=update_many
def delete_one(self, query):
    for i, doc in enumerate(self.docs):
        if self.matches(doc, query):
            self.docs.pop(i)
            break
Collection.delete_one=delete_one
database.is_mongo_online=False
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers import auth,admin
from app.services import admin_store

class AdminTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.root=Path(self.temp.name)
        self.db_patch=patch.object(admin_store,'DB_PATH',self.root/'admin.sqlite3');self.db_patch.start()
        self.store_patch=patch.object(admin,'STORE',self.root/'analyses');self.store_patch.start()
        database.users_collection.docs=[{'id':'admin-1','_id':'a1','full_name':'Admin One','email':'admin@example.test','role':'Administrator','status':'active','is_email_verified':1,'password_hash':database.hash_password('existing-password')[0],'salt':'test-salt'},
                                       {'id':'officer-1','_id':'o1','full_name':'Officer One','email':'officer@example.test','role':'Procurement Officer','status':'active','is_email_verified':1}]
        database.sessions_collection.docs=[]
        app=FastAPI();app.include_router(auth.router);app.include_router(admin.router)
        self.app=app;self.client=TestClient(app)
    def tearDown(self):
        self.db_patch.stop();self.store_patch.stop();self.temp.cleanup()
    def headers(self,user='admin-1'):
        token=auth.issue_login_session(user)
        return {'Authorization':'Bearer '+token}
    def test_every_admin_route_requires_admin(self):
        for path in ['/admin/dashboard','/admin/me','/admin/users/officer-1','/admin/standards/a.txt/source','/admin/health/email','/admin/overview','/admin/users','/admin/audit','/admin/jobs','/auth/users','/auth/health/email']:
            self.assertEqual(self.client.get(path).status_code,401,path)
            self.assertEqual(self.client.get(path,headers=self.headers('officer-1')).status_code,403,path)
        self.assertEqual(self.client.post('/admin/index/rebuild',headers=self.headers('officer-1')).status_code,403)
        self.assertEqual(self.client.post('/auth/toggle-status/admin-1',headers=self.headers('officer-1')).status_code,403)
    def test_user_list_does_not_leak_secrets(self):
        response=self.client.get('/admin/users?limit=1',headers=self.headers())
        self.assertEqual(response.status_code,200);self.assertEqual(response.json()['total'],2)
        self.assertEqual(len(response.json()['items']),1)
        self.assertNotIn('password_hash',response.text);self.assertNotIn('salt',response.text)
    def test_deactivation_revokes_sessions_and_persists_audit(self):
        officer_headers=self.headers('officer-1')
        response=self.client.patch('/admin/users/officer-1',headers=self.headers(),json={'status':'deactivated'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(database.users_collection.find_one({'id':'officer-1'})['status'],'deactivated')
        self.assertEqual(self.client.get('/auth/me',headers=officer_headers).status_code,401)
        audit=self.client.get('/admin/audit',headers=self.headers()).json()
        self.assertEqual(audit['items'][0]['action'],'user.update')
    def test_role_elevation_requires_admin_and_verified_email(self):
        database.users_collection.docs[1]['is_email_verified']=0
        response=self.client.patch('/admin/users/officer-1',headers=self.headers(),json={'role':'Administrator'})
        self.assertEqual(response.status_code,409)
        database.users_collection.docs[1]['is_email_verified']=1
        response=self.client.patch('/admin/users/officer-1',headers=self.headers(),json={'role':'Administrator'})
        self.assertEqual(response.status_code,200)
    def test_self_lockout_prevented(self):
        for change in [{'status':'deactivated'},{'role':'Procurement Officer'}]:
            self.assertEqual(self.client.patch('/admin/users/admin-1',headers=self.headers(),json=change).status_code,409)
    def test_public_admin_signup_rejected(self):
        response=self.client.post('/auth/register',json={'full_name':'Intruder','email':'intruder@example.test','department':'Test','role':'Administrator','password':'password123'})
        self.assertEqual(response.status_code,403)
    def test_google_profile_alone_cannot_login(self):
        response=self.client.post('/auth/google',json={'email':'admin@example.test','name':'Admin','role':'Administrator'})
        self.assertIn(response.status_code,[401,503])
    def test_password_rotation_revokes_old_token(self):
        headers=self.headers()
        wrong=self.client.post('/admin/password',headers=headers,json={'current_password':'wrong','new_password':'a-new-password-123'})
        self.assertEqual(wrong.status_code,400)
        response=self.client.post('/admin/password',headers=headers,json={'current_password':'existing-password','new_password':'a-new-password-123'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/auth/me',headers=headers).status_code,401)
        renewed={'Authorization':'Bearer '+response.json()['access_token']}
        self.assertEqual(self.client.get('/admin/users',headers=renewed).status_code,200)
    def test_traversal_upload_rejected(self):
        response=self.client.post('/admin/standards/upload',headers=self.headers(),files={'file':('../is.123.2020.txt',b'Never write this outside the corpus','text/plain')})
        self.assertEqual(response.status_code,422)
    def test_password_reset_requires_fresh_code_and_revokes_sessions(self):
        headers=self.headers()
        with patch.object(auth,'_process_verify_email_otp',side_effect=auth.HTTPException(400,'Invalid code')):
            response=self.client.post('/auth/reset-password',json={'email':'admin@example.test','otp_code':'000000','new_password':'a-new-password-123'})
        self.assertEqual(response.status_code,400)
        with patch.object(auth,'_process_verify_email_otp',return_value=None):
            response=self.client.post('/auth/reset-password',json={'email':'admin@example.test','otp_code':'123456','new_password':'a-new-password-123'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/auth/me',headers=headers).status_code,401)
    def test_upload_archive_restore_jobs(self):
        from types import SimpleNamespace
        from filelock import FileLock
        docs=self.root/'docs';docs.mkdir()
        (docs/'is.1.2020.txt').write_text('Existing source standard with sufficient text.',encoding='utf-8')
        fake=SimpleNamespace(report=lambda:{'documents':2,'chunks':2,'errors':[]})
        class InlineExecutor:
            def submit(self,fn,*args):fn(*args)
        with patch.object(admin,'data_directory',return_value=docs), patch.object(admin,'ARCHIVE',self.root/'archive'), patch.object(admin,'INDEX_LOCK',FileLock(str(self.root/'index.lock'),thread_local=False)), patch.object(admin,'EXECUTOR',InlineExecutor()), patch.object(admin,'get_corpus',return_value=fake):
            headers=self.headers()
            response=self.client.post('/admin/standards/upload',headers=headers,files={'file':('is.2.2021.txt',b'Indian Standard\nSafety helmet source document for testing.','text/plain')})
            self.assertEqual(response.status_code,202)
            self.assertTrue((docs/'is.2.2021.txt').exists())
            self.assertEqual(self.client.get('/admin/jobs',headers=headers).json()[0]['status'],'completed')
            self.assertEqual(self.client.post('/admin/standards/is.2.2021.txt/archive',headers=headers).status_code,202)
            self.assertFalse((docs/'is.2.2021.txt').exists())
            self.assertTrue((self.root/'archive'/'is.2.2021.txt').exists())
            self.assertEqual(self.client.post('/admin/standards/is.2.2021.txt/restore',headers=headers).status_code,202)
            self.assertTrue((docs/'is.2.2021.txt').exists())

    def test_login_throttle(self):
        for _ in range(10):
            self.assertEqual(self.client.post('/auth/login',json={'email':'admin@example.test','password':'wrong'}).status_code,401)
        self.assertEqual(self.client.post('/auth/login',json={'email':'admin@example.test','password':'wrong'}).status_code,429)

    def test_admin_login_is_separate_from_officer_login(self):
        credentials={'email':'admin@example.test','password':'existing-password'}
        self.assertEqual(self.client.post('/auth/login',json=credentials).status_code,403)
        self.assertEqual(len(database.sessions_collection.docs),0)
        response=self.client.post('/auth/admin/login',json=credentials)
        self.assertEqual(response.status_code,200)
        self.assertEqual(self.client.get('/admin/users',headers={'Authorization':'Bearer '+response.json()['access_token']}).status_code,200)
        database.users_collection.docs[1].update(password_hash=database.hash_password('officer-password')[0],salt='test-salt')
        self.assertEqual(self.client.post('/auth/admin/login',json={'email':'officer@example.test','password':'officer-password'}).status_code,403)

    def test_missing_password_cannot_be_initialized_at_login(self):
        response=self.client.post('/auth/login',json={'email':'officer@example.test','password':'attacker-password'})
        self.assertEqual(response.status_code,401)
        self.assertNotIn('password_hash',database.users_collection.docs[1])

    def test_admin_signup_requires_approver_and_fresh_email_code(self):
        data={'full_name':'New Admin','email':'new@example.test','department':'Operations','password':'new-password-123',
              'email_otp':'123456','approving_email':'admin@example.test','approving_password':'wrong'}
        self.assertEqual(self.client.post('/auth/admin/register',json=data).status_code,401)
        data['approving_password']='existing-password'
        with patch.object(auth,'_process_verify_email_otp',side_effect=auth.HTTPException(400,'Invalid code')):
            self.assertEqual(self.client.post('/auth/admin/register',json=data).status_code,400)
        with patch.object(auth,'_process_verify_email_otp',return_value=None) as otp:
            response=self.client.post('/auth/admin/register',json=data)
            self.assertEqual(response.status_code,201)
            otp.assert_called_once_with('new@example.test','123456')
        self.assertEqual(len(database.sessions_collection.docs),0)
        self.assertEqual(database.users_collection.find_one({'email':'new@example.test'})['role'],'Administrator')
        self.assertEqual(self.client.post('/auth/admin/register',json=data).status_code,409)
        audit=self.client.get('/admin/audit',headers=self.headers()).json()['items']
        self.assertEqual(audit[0]['action'],'administrator.create')
        self.assertNotIn(data['password'],str(audit))

    def test_officer_and_deactivated_admin_cannot_authorize_signup(self):
        data={'full_name':'New Admin','email':'new@example.test','department':'Operations','password':'new-password-123',
              'email_otp':'123456','approving_email':'officer@example.test','approving_password':'officer-password'}
        database.users_collection.docs[1].update(password_hash=database.hash_password('officer-password')[0],salt='test-salt')
        self.assertEqual(self.client.post('/auth/admin/register',json=data).status_code,403)
        database.users_collection.docs[0]['status']='deactivated'
        data.update(approving_email='admin@example.test',approving_password='existing-password')
        self.assertEqual(self.client.post('/auth/admin/register',json=data).status_code,403)
        self.assertEqual(len(database.users_collection.docs),2)

    def test_create_update_delete_account_and_revoke_sessions(self):
        data={'name':'Created Officer','email':'created@example.test','department':'Operations','password':'initial-password-123'}
        self.assertEqual(self.client.post('/admin/users',json=data).status_code,401)
        self.assertEqual(self.client.post('/admin/users',json=data,headers=self.headers('officer-1')).status_code,403)
        headers=self.headers()
        response=self.client.post('/admin/users',json=data,headers=headers)
        self.assertEqual(response.status_code,201)
        self.assertNotIn('password',response.text)
        user_id=response.json()['id']
        self.assertEqual(self.client.post('/admin/users',json=data,headers=headers).status_code,409)
        session=self.headers(user_id)
        self.assertEqual(self.client.patch('/admin/users/'+user_id,json={'name':'Changed Officer'},headers=headers).json()['name'],'Changed Officer')
        self.assertEqual(self.client.delete('/admin/users/'+user_id,headers=self.headers('officer-1')).status_code,403)
        self.assertEqual(self.client.delete('/admin/users/'+user_id,headers=headers).status_code,200)
        self.assertEqual(self.client.get('/auth/me',headers=session).status_code,401)
        self.assertEqual(self.client.delete('/admin/users/admin-1',headers=headers).status_code,409)
        self.assertEqual(self.client.delete('/admin/users/'+user_id,headers=headers).status_code,404)

    def test_public_registration_cannot_overwrite_admin(self):
        before=copy.deepcopy(database.users_collection.docs[0])
        with patch.object(auth,'is_email_verified',return_value=True):
            response=self.client.post('/auth/register',json={'full_name':'Attacker','email':'admin@example.test','department':'Test','role':'Procurement Officer','password':'attack-password'})
        self.assertEqual(response.status_code,409)
        self.assertEqual(database.users_collection.docs[0],before)

    def test_google_auth_requires_configured_verifier(self):
        with patch('app.config.settings.google_client_id',''):
            response=self.client.post('/auth/google',json={'credential':'forged','email':'admin@example.test','name':'Admin'})
        self.assertEqual(response.status_code,503)

    def test_dashboard_uses_saved_records_without_loading_index(self):
        database.users_collection.docs[1].update(department='Public Works',cadre='Procurement Manager',gem_officer_id='OFF-101',jurisdiction_state='Telangana')
        records=[{'id':'analysis-1','owner':'officer-1','product':'Safety equipment','created_at':admin.datetime.now(admin.timezone.utc).isoformat(),'status':'completed','recommendations':3}]
        with patch.object(admin,'analyses',return_value=records), patch.object(admin,'get_corpus',side_effect=AssertionError('Dashboard must not initialize the index')):
            data=self.client.get('/admin/dashboard',headers=self.headers()).json()
        self.assertEqual(data['officers'],1)
        self.assertEqual(data['active_officers'],1)
        self.assertEqual(data['analyses'],1)
        self.assertEqual(data['department_count'],1)
        self.assertEqual(data['trend'][-1]['count'],1)
        self.assertEqual(data['recent_officers'][0]['analyses'],1)
        self.assertEqual(data['recent_officers'][0]['gem_officer_id'],'OFF-101')
        self.assertEqual(data['recent_analyses'][0]['officer_name'],'Officer One')
        self.assertNotIn('password_hash',str(data))

    def test_extended_officer_profile_persists_and_sessions_are_counted(self):
        headers=self.headers()
        self.headers('officer-1')
        stale=self.headers('officer-1')
        self.client.post('/auth/logout',headers=stale)
        fields={'department':'Public Works','mobile_number':'+91 9000000000','cadre':'Procurement Manager','gem_officer_id':'OFF-101','jurisdiction_state':'Telangana'}
        self.assertEqual(self.client.patch('/admin/users/officer-1',headers=headers,json=fields).status_code,200)
        detail=self.client.get('/admin/users/officer-1',headers=headers).json()
        for key,value in fields.items(): self.assertEqual(detail[key],value)
        self.assertEqual(detail['active_sessions'],1)
        self.assertEqual(database.users_collection.find_one({'id':'officer-1'})['organization'],'Public Works')
        self.assertNotIn('password_hash',str(detail))
        self.assertEqual(self.client.get('/admin/users/missing',headers=headers).status_code,404)

    def test_admin_identity_logout_and_fast_standards_listing(self):
        headers=self.headers()
        self.assertEqual(self.client.get('/admin/me',headers=headers).json()['role'],'Administrator')
        with patch('app.services.corpus.peek_corpus',return_value=None), patch.object(admin,'get_corpus',side_effect=AssertionError('Listing must not initialize the index')):
            response=self.client.get('/admin/standards',headers=headers)
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json()['report']['retrieval_mode'],'Awaiting index initialization')
        self.assertEqual(self.client.post('/admin/logout',headers=headers).status_code,200)
        self.assertEqual(self.client.get('/admin/me',headers=headers).status_code,401)

    def test_legacy_accounts_receive_stable_management_ids(self):
        database.users_collection.docs.append({'_id':'legacy-mongo-id','name':'Legacy Officer','email':'legacy@example.test','role':'Procurement Officer'})
        headers=self.headers()
        response=self.client.get('/admin/dashboard',headers=headers)
        self.assertEqual(response.status_code,200)
        user=database.users_collection.find_one({'email':'legacy@example.test'})
        self.assertEqual(user['id'],'usr-legacy-mongo-id')
        self.assertEqual(self.client.get('/admin/users/'+user['id'],headers=headers).json()['name'],'Legacy Officer')

if __name__=='__main__':unittest.main()
