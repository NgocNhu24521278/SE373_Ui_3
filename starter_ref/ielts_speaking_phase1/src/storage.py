"""Durable SQLite mock-test state. Database transactions enforce turn order."""
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from .bank import load_tracks, render_question

DEFAULT_DB = Path(__file__).resolve().parents[1] / 'data' / 'speaking.sqlite3'


def now():
    return datetime.now(timezone.utc).isoformat()


def connect(db_path=DEFAULT_DB):
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('PRAGMA busy_timeout=10000')
    return db


def init_db(db_path=DEFAULT_DB):
    with connect(db_path) as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            learner_id TEXT NOT NULL,
            track TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            question_index INTEGER NOT NULL,
            question_id TEXT NOT NULL,
            question_text TEXT NOT NULL,
            answer_text TEXT NOT NULL,
            saved_at TEXT NOT NULL,
            UNIQUE(session_id, question_index)
        );
        ''')


def start_session(learner_id='demo', track='study', db_path=DEFAULT_DB):
    init_db(db_path)
    if track not in load_tracks():
        raise ValueError('Unknown topic track')
    if not (isinstance(learner_id, str) and learner_id.strip() and len(learner_id) <= 80):
        raise ValueError('Invalid learner ID')
    sid = uuid.uuid4().hex
    with connect(db_path) as conn:
        conn.execute('INSERT INTO sessions VALUES (?,?,?,?)', (sid, learner_id.strip(), track, now()))
    return sid


def session_row(conn, session_id):
    row = conn.execute('SELECT * FROM sessions WHERE id=?', (session_id,)).fetchone()
    if row is None:
        raise ValueError('Session does not exist')
    return row


def current_question(session_id, db_path=DEFAULT_DB):
    with connect(db_path) as conn:
        session = session_row(conn, session_id)
        rows = conn.execute('SELECT answer_text FROM answers WHERE session_id=? ORDER BY question_index',
                            (session_id,)).fetchall()
        last = rows[-1]['answer_text'] if rows else ''
        return render_question(session['track'], len(rows), last)


def save_answer(session_id, question_id, answer, db_path=DEFAULT_DB):
    if not isinstance(answer, str) or not answer.strip():
        raise ValueError('Answer cannot be empty')
    if len(answer) > 5000:
        raise ValueError('Answer length must be at most 5000 characters')
    with connect(db_path) as conn:
        conn.execute('BEGIN IMMEDIATE')
        session = session_row(conn, session_id)
        rows = conn.execute('SELECT answer_text FROM answers WHERE session_id=? ORDER BY question_index',
                            (session_id,)).fetchall()
        last = rows[-1]['answer_text'] if rows else ''
        question = render_question(session['track'], len(rows), last)
        if question is None:
            raise ValueError('Session is complete')
        if question['question_id'] != question_id:
            raise ValueError('Stale or wrong question ID; refresh and retry')
        conn.execute('''INSERT INTO answers
            (session_id, question_index, question_id, question_text, answer_text, saved_at)
            VALUES (?,?,?,?,?,?)''',
            (session_id, len(rows), question_id, question['text'], answer.strip(), now()))
    return {'saved': True, 'completed': progress(session_id, db_path)['completed']}


def progress(session_id, db_path=DEFAULT_DB):
    with connect(db_path) as conn:
        session = session_row(conn, session_id)
        count = conn.execute('SELECT COUNT(*) AS n FROM answers WHERE session_id=?',
                             (session_id,)).fetchone()['n']
        total = len(load_tracks()[session['track']])
        return {'session_id': session_id, 'learner_id': session['learner_id'],
                'track': session['track'], 'completed': count, 'total': total,
                'done': count == total}


def transcript(session_id, db_path=DEFAULT_DB):
    with connect(db_path) as conn:
        session_row(conn, session_id)
        rows = conn.execute('''SELECT question_id, question_text, answer_text, saved_at
                               FROM answers WHERE session_id=? ORDER BY question_index''',
                            (session_id,)).fetchall()
        return [dict(r) for r in rows]
