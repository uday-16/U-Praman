"""Authentication route tests with isolated in-memory collections (no user data writes)."""
import copy
import hashlib
import re
import sys
import types
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

class Collection:
    def __init__(self): self.docs = []
    def matches(self, doc, query):
        for key, value in query.items():
            if key == '$or':
                if not any(self.matches(doc, option) for option in value): return False
            elif isinstance(value, dict) and '$regex' in value:
                if not re.search(value['$regex'], str(doc.get(key, '')), re.I): return False
            elif doc.get(key) != value: return False
        return True
    def find_one(self, query, **kwargs):
        return next((copy.deepcopy(doc) for doc in self.docs if self.matches(doc, query)), None)
    def insert_one(self, doc): self.docs.append(copy.deepcopy(doc))
    def update_one(self, query, update):
        for doc in self.docs:
            if self.matches(doc, query): doc.update(update.get('$set', {})); break

# Import the actual router while keeping tests independent of MongoDB/local files.
database: Any = types.ModuleType('app.database')
for name in ['users_collection', 'otps_collection', 'sessions_collection']:
    setattr(database, name, Collection())
database.hash_password = lambda password: (hashlib.sha256(password.encode()).hexdigest(), 'test-salt')
database.verify_password = lambda password, hashed, salt: database.hash_password(password)[0] == hashed
database.hash_otp = database.hash_password
database.verify_otp_hash = database.verify_password
sys.modules['app.database'] = database
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routers import auth

app = FastAPI()
app.include_router(auth.router, prefix='/api/v1')

class SessionTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        database.sessions_collection.docs.clear()
        database.users_collection.docs = [{
            '_id': 'test-id', 'id': 'officer-1', 'full_name': 'Test Officer',
            'email': 'test@example.com', 'role': 'Procurement Officer', 'status': 'active',
            'password_hash': database.hash_password('correct-password')[0], 'salt': 'test-salt'
        }]
    def login(self, password='correct-password'):
        return self.client.post('/api/v1/auth/login', json={'email':'test@example.com', 'password':password, 'role':'Procurement Officer'})
    def headers(self, token): return {'Authorization':'Bearer '+token}
    def test_only_successful_login_creates_session(self):
        self.assertEqual(self.login('wrong-password').status_code, 401)
        self.assertEqual(len(database.sessions_collection.docs), 0)
        response = self.login()
        self.assertEqual(response.status_code, 200)
        token = response.json()['access_token']
        self.assertNotIn(token, str(database.sessions_collection.docs))
        me = self.client.get('/api/v1/auth/me', headers=self.headers(token))
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()['id'], 'officer-1')
    def test_missing_or_fabricated_tokens_are_rejected(self):
        self.assertEqual(self.client.get('/api/v1/auth/me').status_code, 401)
        self.assertEqual(self.client.get('/api/v1/auth/me', headers=self.headers('praman_jwt_unregistered')).status_code, 401)
    def test_expired_session_is_rejected(self):
        token = self.login().json()['access_token']
        database.sessions_collection.docs[0]['expires_at'] = (datetime.now(timezone.utc)-timedelta(seconds=1)).isoformat()
        self.assertEqual(self.client.get('/api/v1/auth/me', headers=self.headers(token)).status_code, 401)
    def test_logout_revokes_session(self):
        token = self.login().json()['access_token']
        self.assertEqual(self.client.post('/api/v1/auth/logout', headers=self.headers(token)).status_code, 200)
        self.assertEqual(self.client.get('/api/v1/auth/me', headers=self.headers(token)).status_code, 401)
    def test_deactivated_account_is_rejected(self):
        token = self.login().json()['access_token']
        database.users_collection.docs[0]['status'] = 'deactivated'
        self.assertEqual(self.client.get('/api/v1/auth/me', headers=self.headers(token)).status_code, 401)
    def test_login_role_autodetected_without_error(self):
        response = self.client.post('/api/v1/auth/login', json={'email':'test@example.com', 'password':'correct-password', 'role':'Administrator'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['user']['role'], 'Procurement Officer')
    def test_update_profile_persists_in_database(self):
        token = self.login().json()['access_token']
        update_data = {
            'name': 'Updated Officer',
            'mobile_number': '+91 9999988888',
            'department': 'Central Public Works',
            'cadre': 'Chief Technical Cadre',
            'gem_officer_id': 'GEM-IND-777',
            'jurisdiction_state': 'Maharashtra'
        }
        res = self.client.put('/api/v1/auth/profile', json=update_data, headers=self.headers(token))
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['name'], 'Updated Officer')
        self.assertEqual(data['gem_officer_id'], 'GEM-IND-777')
        self.assertEqual(data['jurisdiction_state'], 'Maharashtra')
        me = self.client.get('/api/v1/auth/me', headers=self.headers(token)).json()
        self.assertEqual(me['name'], 'Updated Officer')
        self.assertEqual(me['gem_officer_id'], 'GEM-IND-777')

if __name__ == '__main__': unittest.main()
