import test from 'node:test';
import assert from 'node:assert/strict';
import {
  loadTracks,
  topicPhrase,
  renderQuestion,
  parseCueCard,
  validateAnswerInput,
  buildPreliminaryFeedback,
  SpeakingStore,
} from './speakingEngine';

test('01: 16 questions and three ordered parts across study and technology tracks', () => {
  const tracks = loadTracks();
  assert.equal(Object.keys(tracks).length, 2);
  const total = Object.values(tracks).reduce((acc, arr) => acc + arr.length, 0);
  assert.equal(total, 16);
  for (const items of Object.values(tracks)) {
    const parts = new Set(items.map((x) => x.part));
    assert.deepEqual(parts, new Set([1, 2, 3]));
  }
});

test('02: new learner starts at Part 1 Question 1 with 0 completed', () => {
  const store = new SpeakingStore();
  const sid = store.startSession('u1', 'study');
  const q = store.currentQuestion(sid);
  assert.ok(q);
  assert.equal(q.part, 1);
  assert.equal(q.number, 1);
  assert.equal(store.progress(sid).completed, 0);
});

test('03: save answer and advance to personalized followup', () => {
  const store = new SpeakingStore();
  const sid = store.startSession('u1', 'study');
  const q1 = store.currentQuestion(sid)!;
  store.saveAnswer(sid, q1.question_id, 'I like studying with friends.');
  const q2 = store.currentQuestion(sid)!;
  assert.equal(q2.kind, 'followup');
  assert.ok(q2.text.includes('spending time with friends'));
});

test('04: followup dynamically changes with candidate answer keywords', () => {
  const store = new SpeakingStore();
  const a = store.startSession('a', 'study');
  const b = store.startSession('b', 'study');
  store.saveAnswer(a, store.currentQuestion(a)!.question_id, 'My family helps me.');
  store.saveAnswer(b, store.currentQuestion(b)!.question_id, 'I practice using online lessons.');
  assert.notEqual(store.currentQuestion(a)!.text, store.currentQuestion(b)!.text);
});

test('05: empty answer is rejected by both validator and storage', () => {
  const store = new SpeakingStore();
  const sid = store.startSession();
  const q = store.currentQuestion(sid)!;
  const v = validateAnswerInput('   ', q);
  assert.equal(v.valid, false);
  assert.throws(() => store.saveAnswer(sid, q.question_id, '   '), /empty/);
  assert.equal(store.progress(sid).completed, 0);
});

test('06: answer exceeding 5000 chars is rejected', () => {
  const store = new SpeakingStore();
  const sid = store.startSession();
  const q = store.currentQuestion(sid)!;
  assert.throws(() => store.saveAnswer(sid, q.question_id, 'a'.repeat(5001)), /5000/);
});

test('07 & 08: wrong or duplicate question ID is rejected', () => {
  const store = new SpeakingStore();
  const sid = store.startSession();
  const qid = store.currentQuestion(sid)!.question_id;
  assert.throws(() => store.saveAnswer(sid, 'wrong-q', 'My answer'), /Stale/);
  store.saveAnswer(sid, qid, 'First valid answer');
  assert.throws(() => store.saveAnswer(sid, qid, 'Duplicate answer'), /Stale/);
  assert.equal(store.transcript(sid).length, 1);
});

test('10 & 11 & 12: reaches Part 2 Cue Card, Part 3 Discussion, and finishes exam cleanly', () => {
  const store = new SpeakingStore();
  const sid = store.startSession();
  for (let i = 0; i < 3; i++) {
    const q = store.currentQuestion(sid)!;
    store.saveAnswer(sid, q.question_id, 'Learning with friends helps me.');
  }
  const p2 = store.currentQuestion(sid)!;
  assert.equal(p2.part, 2);
  assert.equal(p2.kind, 'cue');
  const parsed = parseCueCard(p2.text);
  assert.equal(parsed.bullets.length, 3);

  for (let i = 3; i < 5; i++) {
    const q = store.currentQuestion(sid)!;
    store.saveAnswer(sid, q.question_id, 'Regular practice is important for learning.');
  }
  assert.equal(store.currentQuestion(sid)!.part, 3);

  for (let i = 5; i < 8; i++) {
    const q = store.currentQuestion(sid)!;
    store.saveAnswer(sid, q.question_id, 'Technology and online education help society progress.');
  }
  assert.equal(store.currentQuestion(sid), null);
  assert.equal(store.progress(sid).done, true);

  const feedback = buildPreliminaryFeedback(store.transcript(sid));
  assert.equal(feedback.totalAnswers, 8);
  assert.ok(feedback.disclaimer.includes('Pronunciation: not_assessed'));
});

test('18: agent tool-calling loop records save_candidate_answer then fetch_current_question', () => {
  const store = new SpeakingStore();
  const sid = store.startSession();
  const first = store.runAgent(sid, 'start');
  assert.ok(first.tools_called.includes('fetch_current_question'));
  const qid = first.question!.question_id;
  const next = store.runAgent(sid, 'submit', {
    questionId: qid,
    answer: 'I practice English with my friends every day.',
  });
  assert.deepEqual(next.tools_called, ['save_candidate_answer', 'fetch_current_question']);
  assert.equal(next.progress.completed, 1);
  const events = store.recentLogs(sid);
  assert.ok(events.some((e) => e.kind === 'agent.tool_call'));
  assert.ok(events.some((e) => e.kind === 'agent.tool_result'));
});
