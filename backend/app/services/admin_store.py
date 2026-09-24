"""Small durable administration ledger: audit events, jobs and login throttling."""
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import sqlite3
import json
import time
import hashlib

DB_PATH = Path(__file__).resolve().parents[2] / 'data' / 'administration.sqlite3'

@contextmanager
def connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH, timeout=15)
    db.row_factory = sqlite3.Row
    db.executescript('''CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY, at TEXT, actor TEXT, action TEXT, target TEXT, details TEXT);
    CREATE TABLE IF NOT EXISTS jobs (id TEXT PRIMARY KEY, at TEXT, actor TEXT, kind TEXT, status TEXT, message TEXT, report TEXT);
    CREATE TABLE IF NOT EXISTS login_limits (key TEXT PRIMARY KEY, start REAL, failures INTEGER);''')
    try:
        yield db
        db.commit()
    finally: db.close()

def audit(actor, action, target='', details=None):
    with connection() as db:
        db.execute('INSERT INTO audit(at,actor,action,target,details) VALUES(?,?,?,?,?)',
                   (datetime.now(timezone.utc).isoformat(), str(actor), action, str(target), json.dumps(details or {})))

def login_attempt(identifier, address, success=False):
    key = hashlib.sha256((identifier.lower() + '|' + address).encode()).hexdigest()
    with connection() as db:
        db.execute('BEGIN IMMEDIATE')
        if success:
            db.execute('DELETE FROM login_limits WHERE key=?', (key,)); return True
        row = db.execute('SELECT * FROM login_limits WHERE key=?', (key,)).fetchone()
        now = time.time()
        if row and now-row['start'] < 900:
            if row['failures'] >= 10: return False
            db.execute('UPDATE login_limits SET failures=failures+1 WHERE key=?',(key,))
        else:
            db.execute('INSERT OR REPLACE INTO login_limits VALUES(?,?,1)',(key,now))
        db.execute('DELETE FROM login_limits WHERE start<?',(now-86400,))
    return True
