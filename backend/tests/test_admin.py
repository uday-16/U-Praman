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
        for path in ['/admin/overview','/admin/users','/admin/audit','/admin/jobs','/auth/users','/auth/health/email']:
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

if __name__=='__main__':unittest.main()
