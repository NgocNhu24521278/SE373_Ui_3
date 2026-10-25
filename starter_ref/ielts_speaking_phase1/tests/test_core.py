"""The deterministic Phase-1 acceptance/evaluation suite."""
import json
import pytest

from src.bank import load_tracks, topic_phrase
from src.storage import (start_session, current_question, save_answer,
                         transcript, progress)
from src.trace import log, recent_logs


def test_01_16_questions_and_three_ordered_parts():
    tracks = load_tracks()
    assert len(tracks) == 2
    assert sum(map(len, tracks.values())) == 16
    for items in tracks.values():
        assert set(x['part'] for x in items) == {1, 2, 3}


def test_02_new_learner_first_part_one(db):
    sid = start_session('u1', db_path=db)
    q = current_question(sid, db)
    assert (q['part'], q['number']) == (1, 1)
    assert progress(sid, db)['completed'] == 0


def test_03_save_and_advance_to_followup(db):
    sid = start_session(db_path=db)
    q = current_question(sid, db)
    save_answer(sid, q['question_id'], 'I like studying with friends.', db)
    q = current_question(sid, db)
    assert q['kind'] == 'followup'
    assert 'spending time with friends' in q['text']


def test_04_followup_changes_with_answer(db):
    a = start_session('a', db_path=db)
    b = start_session('b', db_path=db)
    save_answer(a, current_question(a, db)['question_id'], 'My family helps me.', db)
    save_answer(b, current_question(b, db)['question_id'], 'I practice using online lessons.', db)
    assert current_question(a, db)['text'] != current_question(b, db)['text']


def test_05_empty_answer_rejected(db):
    sid = start_session(db_path=db)
    with pytest.raises(ValueError, match='empty'):
        save_answer(sid, current_question(sid, db)['question_id'], '   ', db)
    assert progress(sid, db)['completed'] == 0


def test_06_too_long_answer_rejected(db):
    sid = start_session(db_path=db)
    with pytest.raises(ValueError, match='5000'):
        save_answer(sid, current_question(sid, db)['question_id'], 'a' * 5001, db)


def test_07_wrong_question_id_rejected(db):
    sid = start_session(db_path=db)
    with pytest.raises(ValueError, match='Stale'):
        save_answer(sid, 'wrong-q', 'My answer', db)
    assert progress(sid, db)['completed'] == 0


def test_08_repeated_submission_does_not_duplicate(db):
    sid = start_session(db_path=db)
    qid = current_question(sid, db)['question_id']
    save_answer(sid, qid, 'First answer', db)
    with pytest.raises(ValueError, match='Stale'):
        save_answer(sid, qid, 'Duplicate answer', db)
    assert len(transcript(sid, db)) == 1


def test_09_two_users_are_isolated(db):
    sid1 = start_session('alpha', db_path=db)
    sid2 = start_session('beta', db_path=db)
    save_answer(sid1, current_question(sid1, db)['question_id'], 'Secret answer', db)
    assert progress(sid2, db)['completed'] == 0
    assert transcript(sid2, db) == []


def test_10_part_two_cue_is_reached(db):
    sid = start_session(db_path=db)
    for _ in range(3):
        q = current_question(sid, db)
        save_answer(sid, q['question_id'], 'Learning with friends helps me.', db)
    assert current_question(sid, db)['part'] == 2
    assert current_question(sid, db)['kind'] == 'cue'


def test_11_part_three_discussion_is_reached(db):
    sid = start_session(db_path=db)
    for _ in range(5):
        q = current_question(sid, db)
        save_answer(sid, q['question_id'], 'Practice is important for learning.', db)
    assert current_question(sid, db)['part'] == 3


def test_12_exam_finishes_and_rejects_more_answers(db):
    sid = start_session(db_path=db)
    total = progress(sid, db)['total']
    for _ in range(total):
        q = current_question(sid, db)
        save_answer(sid, q['question_id'], 'My detailed sample answer.', db)
    assert current_question(sid, db) is None
    assert progress(sid, db)['done']
    with pytest.raises(ValueError):
        save_answer(sid, 'anything', 'another answer', db)


def test_13_state_persists_between_database_connections(db):
    sid = start_session(db_path=db)
    q = current_question(sid, db)
    save_answer(sid, q['question_id'], 'A persistent reply.', db)
    # Each function opens a new SQLite connection; state stays on disk.
    assert progress(sid, db)['completed'] == 1
    assert transcript(sid, db)[0]['answer_text'] == 'A persistent reply.'


def test_14_technology_track_differs(db):
    sid = start_session(track='technology', db_path=db)
    assert current_question(sid, db)['question_id'].startswith('te-')


def test_15_trace_file_tracks_steps(tmp_path):
    file = tmp_path / 'trace.jsonl'
    log('S01', 'agent.start', {'action': 'start'}, log_path=file)
    log('S01', 'agent.finish', {'called_tools': ['fetch_current_question']}, log_path=file)
    log('S02', 'agent.start', log_path=file)
    events = recent_logs('S01', log_path=file)
    assert len(events) == 2
    assert events[1]['payload']['called_tools'] == ['fetch_current_question']


def test_16_unknown_session_rejected(db):
    with pytest.raises(ValueError, match='does not exist'):
        progress('missing', db)


def test_17_skill_exists_and_mentions_these_constraints():
    from pathlib import Path
    skill = (Path(__file__).resolve().parents[1] / 'skills' / 'speaking_examiner' / 'SKILL.md').read_text(encoding='utf-8').lower()
    assert 'part 1' in skill and 'part 2' in skill and 'part 3' in skill
    assert 'pronunciation' in skill


def test_18_scripted_agent_real_tool_loop(db, tmp_path):
    pytest.importorskip('langchain', reason='LangChain packages unavailable in this environment')
    from src.examiner_agent import run_agent
    sid = start_session(db_path=db)
    trace_file = tmp_path / 'agent.jsonl'
    first = run_agent(sid, 'start', db_path=db, log_path=trace_file)
    assert 'fetch_current_question' in first['tools_called']
    qid = first['question']['question_id']
    next_ = run_agent(sid, 'submit', db_path=db, question_id=qid,
                      answer='I practice English with my friends.', log_path=trace_file)
    assert next_['tools_called'] == ['save_candidate_answer', 'fetch_current_question']
    assert next_['progress']['completed'] == 1
    events = recent_logs(sid, trace_file)
    assert any(x['kind'] == 'agent.tool_call' for x in events)
    assert any(x['kind'] == 'agent.tool_result' for x in events)
