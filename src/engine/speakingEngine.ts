export type QuestionKind = 'base' | 'followup' | 'cue';
export type TopicTrack = 'study' | 'technology';

export interface RawQuestionItem {
  id: string;
  part: 1 | 2 | 3;
  kind: QuestionKind;
  text: string;
}

export interface RenderedQuestion {
  question_id: string;
  index: number;
  number: number;
  total: number;
  part: 1 | 2 | 3;
  kind: QuestionKind;
  text: string;
}

export interface SavedAnswerRow {
  question_id: string;
  question_index: number;
  part: 1 | 2 | 3;
  kind: QuestionKind;
  question_text: string;
  answer_text: string;
  word_count: number;
  saved_at: string;
}

export interface SessionProgress {
  session_id: string;
  learner_id: string;
  track: TopicTrack;
  completed: number;
  total: number;
  done: boolean;
  created_at: string;
}

export interface TraceEvent {
  time: string;
  session_id: string;
  kind: string;
  payload: Record<string, unknown>;
}

export interface SessionRecord {
  id: string;
  learner_id: string;
  track: TopicTrack;
  created_at: string;
  answers: SavedAnswerRow[];
  traces: TraceEvent[];
}

export interface AgentRunResult {
  message: string;
  tools_called: string[];
  question: RenderedQuestion | null;
  progress: SessionProgress;
}

export interface PartGuidance {
  part: 1 | 2 | 3;
  title: string;
  subtitle: string;
  targetWords: string;
  minRecommendedWords: number;
  tips: string[];
  formatNote: string;
}

export interface ParsedCueCard {
  topicHeadline: string;
  promptHeader: string;
  bullets: string[];
  closingExplain: string;
}

export interface PreliminaryFeedback {
  totalAnswers: number;
  totalWords: number;
  avgWordsPerTurn: number;
  partBreakdown: {
    part: 1 | 2 | 3;
    label: string;
    turnsAnswered: number;
    avgWords: number;
    statusLabel: string;
    observation: string;
  }[];
  strengths: string[];
  nextSteps: string[];
  disclaimer: string;
}

export const QUESTION_BANK: {
  source: string;
  license: string;
  tracks: Record<TopicTrack, RawQuestionItem[]>;
} = {
  source: 'Original sample questions authored for this Phase 1 project; not an official IELTS question bank',
  license: 'CC BY 4.0 (Self-written for Phase 1 MVP)',
  tracks: {
    study: [
      {
        id: 'st-p1-01',
        part: 1,
        kind: 'base',
        text: 'Are you a student or do you work? Tell me a little about your daily routine.',
      },
      {
        id: 'st-p1-02',
        part: 1,
        kind: 'followup',
        text: 'You mentioned {anchor}. Why is that important to you personally?',
      },
      {
        id: 'st-p1-03',
        part: 1,
        kind: 'base',
        text: 'What do you enjoy most about learning something new?',
      },
      {
        id: 'st-p2-01',
        part: 2,
        kind: 'cue',
        text: 'Describe a skill you would like to learn.\n\nYou should say:\n- what the skill is\n- how you would learn it\n- why you want to learn it\n\nand explain how it might help you in the future.',
      },
      {
        id: 'st-p2-02',
        part: 2,
        kind: 'followup',
        text: 'You talked about {anchor}. What might be the hardest part of learning this skill?',
      },
      {
        id: 'st-p3-01',
        part: 3,
        kind: 'base',
        text: 'Do you think schools should focus more on practical skills than academic subjects? Why?',
      },
      {
        id: 'st-p3-02',
        part: 3,
        kind: 'followup',
        text: 'You mentioned {anchor}. Can you give a concrete example and consider an opposing view?',
      },
      {
        id: 'st-p3-03',
        part: 3,
        kind: 'base',
        text: 'How might technology change the way people learn new skills in the next ten years?',
      },
    ],
    technology: [
      {
        id: 'te-p1-01',
        part: 1,
        kind: 'base',
        text: 'How often do you use technology during your day?',
      },
      {
        id: 'te-p1-02',
        part: 1,
        kind: 'followup',
        text: 'You mentioned {anchor}. What difference does it make to your everyday life?',
      },
      {
        id: 'te-p1-03',
        part: 1,
        kind: 'base',
        text: 'Do you prefer communicating online or face to face? Why?',
      },
      {
        id: 'te-p2-01',
        part: 2,
        kind: 'cue',
        text: 'Describe a useful piece of technology you have used.\n\nYou should say:\n- what it is\n- when you started using it\n- what you use it for\n\nand explain why it is useful to you.',
      },
      {
        id: 'te-p2-02',
        part: 2,
        kind: 'followup',
        text: 'You referred to {anchor}. Would you recommend this technology to an older person? Why or why not?',
      },
      {
        id: 'te-p3-01',
        part: 3,
        kind: 'base',
        text: 'What are some disadvantages of relying too much on technology?',
      },
      {
        id: 'te-p3-02',
        part: 3,
        kind: 'followup',
        text: 'You mentioned {anchor}. How should society address that problem?',
      },
      {
        id: 'te-p3-03',
        part: 3,
        kind: 'base',
        text: 'Should governments do more to make digital technology available to everyone?',
      },
    ],
  },
};

export const PART_GUIDANCE: Record<1 | 2 | 3, PartGuidance> = {
  1: {
    part: 1,
    title: 'Part 1: Introduction & Interview',
    subtitle: 'Familiar topics about your studies, daily habits, and personal interests',
    targetWords: '25–50 words (2–4 sentences)',
    minRecommendedWords: 15,
    tips: [
      'Avoid single-word or yes/no answers; state your direct answer and add one concrete reason or detail.',
      'The examiner agent will pick up on keywords from your response to ask a personalized follow-up.',
    ],
    formatNote: 'Questions 1–3 · Direct personal response + 1 contextual follow-up',
  },
  2: {
    part: 2,
    title: 'Part 2: Individual Long Turn (Cue Card)',
    subtitle: 'Extended structured response covering all prompts on the task card',
    targetWords: '110–180 words (structured paragraph)',
    minRecommendedWords: 50,
    tips: [
      'Address all bullet points on the cue card in a logical sequence and explain the final prompt clearly.',
      'Use linking phrases (First of all, In terms of how..., The main reason is...) and one specific personal example.',
    ],
    formatNote: 'Questions 4–5 · Cue Card long turn + 1 rounding-off follow-up question',
  },
  3: {
    part: 3,
    title: 'Part 3: Two-Way Abstract Discussion',
    subtitle: 'Analytical questions exploring broader societal trends, causes, and counterarguments',
    targetWords: '45–90 words (3–5 analytical sentences)',
    minRecommendedWords: 25,
    tips: [
      'Move beyond personal anecdotes to discuss society, education, or future trends in general.',
      'Support your position with a concrete real-world example and acknowledge an alternative perspective.',
    ],
    formatNote: 'Questions 6–8 · Abstract discussion + 1 deep-dive follow-up',
  },
};

export function loadTracks(): Record<TopicTrack, RawQuestionItem[]> {
  return QUESTION_BANK.tracks;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function topicPhrase(answer: string): string {
  const text = answer.toLowerCase().replace(/[^a-z ]/g, ' ');
  const patterns: [RegExp, string][] = [
    [/\bfriends?\b/, 'spending time with friends'],
    [/\bfamil(?:y|ies)\b/, 'your family'],
    [/\bonline\b/, 'learning online'],
    [/\bteacher\b/, 'your teacher'],
    [/\bpractice\b/, 'regular practice'],
    [/\btechnology\b/, 'technology'],
    [/\bgame\b/, 'playing games'],
    [/\benglish\b/, 'learning English'],
    [/\bcomputer\b/, 'computers'],
    [/\btime\b/, 'managing your time'],
  ];
  for (const [regex, label] of patterns) {
    if (regex.test(text)) {
      return label;
    }
  }
  return 'that point';
}

export function renderQuestion(
  track: TopicTrack,
  index: number,
  previousAnswer: string = ''
): RenderedQuestion | null {
  const questions = QUESTION_BANK.tracks[track];
  if (!questions) {
    throw new Error('Unknown topic track');
  }
  if (index < 0 || index >= questions.length) {
    return null;
  }
  const item = questions[index];
  const text = item.text.replace('{anchor}', topicPhrase(previousAnswer));
  return {
    question_id: item.id,
    index,
    number: index + 1,
    total: questions.length,
    part: item.part,
    kind: item.kind,
    text,
  };
}

export function parseCueCard(text: string): ParsedCueCard {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const topicHeadline = lines[0] || text;
  const bullets: string[] = [];
  let promptHeader = 'You should say:';
  let closingExplain = '';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().startsWith('you should say')) {
      promptHeader = line;
    } else if (line.startsWith('-')) {
      bullets.push(line.replace(/^-\s*/, ''));
    } else {
      closingExplain = line;
    }
  }

  return {
    topicHeadline,
    promptHeader,
    bullets,
    closingExplain,
  };
}

export function validateAnswerInput(
  answer: string,
  question: RenderedQuestion | null
): { valid: boolean; error?: string; warning?: string; wordCount: number } {
  if (!question) {
    return { valid: false, error: 'Session is already complete.', wordCount: 0 };
  }
  if (typeof answer !== 'string' || !answer.trim()) {
    return { valid: false, error: 'Answer cannot be empty. Please type your response in English before submitting.', wordCount: 0 };
  }
  if (answer.length > 5000) {
    return { valid: false, error: 'Answer length must be at most 5000 characters.', wordCount: countWords(answer) };
  }
  const words = countWords(answer);
  const minRec = PART_GUIDANCE[question.part].minRecommendedWords;
  const warning =
    words < minRec
      ? `Short response (${words} words). For Part ${question.part}, aiming for at least ${minRec}+ words helps practice fuller development.`
      : undefined;

  return { valid: true, warning, wordCount: words };
}

export function buildPreliminaryFeedback(rows: SavedAnswerRow[]): PreliminaryFeedback {
  const totalAnswers = rows.length;
  const totalWords = rows.reduce((acc, r) => acc + r.word_count, 0);
  const avgWordsPerTurn = totalAnswers > 0 ? Math.round(totalWords / totalAnswers) : 0;

  const partConfigs: { part: 1 | 2 | 3; label: string; minTarget: number }[] = [
    { part: 1, label: 'Part 1 · Introduction & Interview', minTarget: 20 },
    { part: 2, label: 'Part 2 · Cue Card Long Turn', minTarget: 70 },
    { part: 3, label: 'Part 3 · Abstract Discussion', minTarget: 35 },
  ];

  const partBreakdown = partConfigs.map(({ part, label, minTarget }) => {
    const partRows = rows.filter((r) => r.part === part);
    const turnsAnswered = partRows.length;
    const words = partRows.reduce((s, r) => s + r.word_count, 0);
    const avgWords = turnsAnswered > 0 ? Math.round(words / turnsAnswered) : 0;

    let statusLabel = 'Not started';
    let observation = 'Complete the questions in this part to view practice length feedback.';
    if (turnsAnswered > 0) {
      if (avgWords >= minTarget) {
        statusLabel = 'Well developed';
        observation = `Average of ${avgWords} words/turn meets the recommended elaboration depth for Part ${part}.`;
      } else {
        statusLabel = 'Needs expansion';
        observation = `Average of ${avgWords} words/turn is below the ${minTarget}+ word target for Part ${part}. Add supporting reasons or examples.`;
      }
    }

    return {
      part,
      label,
      turnsAnswered,
      avgWords,
      statusLabel,
      observation,
    };
  });

  const strengths: string[] = [];
  const nextSteps: string[] = [];

  if (totalAnswers === 8) {
    strengths.push('Completed all 8 turns across Part 1, Part 2 (Cue Card), and Part 3 without skipping.');
  }
  const p2Cue = rows.find((r) => r.kind === 'cue');
  if (p2Cue && p2Cue.word_count >= 70) {
    strengths.push(`Part 2 Cue Card response was well-elaborated (${p2Cue.word_count} words).`);
  } else if (p2Cue) {
    nextSteps.push(`Expand your Part 2 Cue Card response (currently ${p2Cue.word_count} words; aim for 110–180 words covering every bullet point).`);
  }

  const p3Rows = rows.filter((r) => r.part === 3);
  const p3Avg = p3Rows.length ? Math.round(p3Rows.reduce((s, r) => s + r.word_count, 0) / p3Rows.length) : 0;
  if (p3Avg >= 35) {
    strengths.push(`Part 3 discussion answers demonstrated analytical length (${p3Avg} words/turn).`);
  } else if (p3Rows.length > 0) {
    nextSteps.push('In Part 3, use the "Point → Reason → Concrete Example → Counter-view" structure to lengthen your abstract discussion.');
  }

  if (strengths.length === 0) {
    strengths.push('Recorded structured English practice responses persisted to session storage.');
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Review your transcript for discourse markers (however, for instance, consequently) and varied grammatical structures.');
  }

  return {
    totalAnswers,
    totalWords,
    avgWordsPerTurn,
    partBreakdown,
    strengths,
    nextSteps,
    disclaimer:
      'Điểm ước lượng / Nhận xét luyện tập do hệ thống tạo từ văn bản (Text-Only Prototype), chỉ dùng để luyện tập, không đánh giá phát âm (Pronunciation: not_assessed) hay độ trôi chảy âm học và không thay thế điểm thi IELTS chính thức.',
  };
}

// In-memory / LocalStorage-backed deterministic store mirroring src/storage.py + src/examiner_agent.py
export class SpeakingStore {
  private sessions: Map<string, SessionRecord> = new Map();

  constructor(initialSessions?: SessionRecord[]) {
    if (initialSessions) {
      for (const s of initialSessions) {
        this.sessions.set(s.id, s);
      }
    }
  }

  public getAllSessions(): SessionRecord[] {
    return Array.from(this.sessions.values()).sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    );
  }

  public startSession(learnerId: string = 'demo_student', track: TopicTrack = 'study', customId?: string): string {
    if (!(track in QUESTION_BANK.tracks)) {
      throw new Error('Unknown topic track');
    }
    const cleanLearner = typeof learnerId === 'string' ? learnerId.trim() : '';
    if (!cleanLearner || cleanLearner.length > 80) {
      throw new Error('Invalid learner ID: must be 1–80 non-empty characters');
    }
    const sid = customId || this.generateHexId();
    const record: SessionRecord = {
      id: sid,
      learner_id: cleanLearner,
      track,
      created_at: new Date().toISOString(),
      answers: [],
      traces: [],
    };
    this.sessions.set(sid, record);
    return sid;
  }

  private getSessionOrThrow(sessionId: string): SessionRecord {
    const cleanId = sessionId.trim();
    const s = this.sessions.get(cleanId);
    if (!s) {
      throw new Error(`Session "${cleanId || '(empty)'}" does not exist. Check your Session ID or start a new mock test.`);
    }
    return s;
  }

  public currentQuestion(sessionId: string): RenderedQuestion | null {
    const s = this.getSessionOrThrow(sessionId);
    const lastAnswer = s.answers.length > 0 ? s.answers[s.answers.length - 1].answer_text : '';
    return renderQuestion(s.track, s.answers.length, lastAnswer);
  }

  public saveAnswer(sessionId: string, questionId: string, answer: string): { saved: boolean; completed: number } {
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error('Answer cannot be empty');
    }
    if (answer.length > 5000) {
      throw new Error('Answer length must be at most 5000 characters');
    }
    const s = this.getSessionOrThrow(sessionId);
    const lastAnswer = s.answers.length > 0 ? s.answers[s.answers.length - 1].answer_text : '';
    const question = renderQuestion(s.track, s.answers.length, lastAnswer);
    if (!question) {
      throw new Error('Session is complete');
    }
    if (question.question_id !== questionId) {
      throw new Error('Stale or wrong question ID; refresh and retry');
    }
    const cleanAnswer = answer.trim();
    s.answers.push({
      question_id: questionId,
      question_index: s.answers.length,
      part: question.part,
      kind: question.kind,
      question_text: question.text,
      answer_text: cleanAnswer,
      word_count: countWords(cleanAnswer),
      saved_at: new Date().toISOString(),
    });
    return { saved: true, completed: s.answers.length };
  }

  public progress(sessionId: string): SessionProgress {
    const s = this.getSessionOrThrow(sessionId);
    const total = QUESTION_BANK.tracks[s.track].length;
    const completed = s.answers.length;
    return {
      session_id: s.id,
      learner_id: s.learner_id,
      track: s.track,
      completed,
      total,
      done: completed === total,
      created_at: s.created_at,
    };
  }

  public transcript(sessionId: string): SavedAnswerRow[] {
    const s = this.getSessionOrThrow(sessionId);
    return [...s.answers];
  }

  public log(sessionId: string, kind: string, payload: Record<string, unknown> = {}): TraceEvent {
    const s = this.getSessionOrThrow(sessionId);
    const event: TraceEvent = {
      time: new Date().toISOString(),
      session_id: sessionId,
      kind,
      payload,
    };
    s.traces.push(event);
    return event;
  }

  public recentLogs(sessionId: string, limit: number = 40): TraceEvent[] {
    const s = this.getSessionOrThrow(sessionId);
    return s.traces.slice(-limit);
  }

  public runAgent(
    sessionId: string,
    action: 'start' | 'submit' | 'progress',
    options?: { questionId?: string; answer?: string; mode?: 'scripted' | 'llm' }
  ): AgentRunResult {
    if (!['start', 'submit', 'progress'].includes(action)) {
      throw new Error('Unknown action');
    }
    const mode = options?.mode || 'scripted';
    if (action === 'submit' && (!options?.questionId || options?.answer === undefined)) {
      throw new Error('Must provide question_id and answer');
    }

    this.log(sessionId, 'agent.start', { action, mode, skill: 'speaking_examiner/SKILL.md' });
    const toolsCalled: string[] = [];

    if (action === 'start') {
      toolsCalled.push('fetch_current_question');
      this.log(sessionId, 'agent.tool_call', { tool: 'fetch_current_question' });
      this.log(sessionId, 'tool.fetch_current_question', {});
      this.currentQuestion(sessionId);
      this.log(sessionId, 'agent.tool_result', { tool: 'fetch_current_question', status: 'returned' });
    } else if (action === 'submit') {
      toolsCalled.push('save_candidate_answer');
      this.log(sessionId, 'agent.tool_call', { tool: 'save_candidate_answer' });
      this.log(sessionId, 'tool.save_candidate_answer', { question_id: options!.questionId });
      this.saveAnswer(sessionId, options!.questionId!, options!.answer!);
      this.log(sessionId, 'agent.tool_result', { tool: 'save_candidate_answer', status: 'returned' });

      toolsCalled.push('fetch_current_question');
      this.log(sessionId, 'agent.tool_call', { tool: 'fetch_current_question' });
      this.log(sessionId, 'tool.fetch_current_question', {});
      this.currentQuestion(sessionId);
      this.log(sessionId, 'agent.tool_result', { tool: 'fetch_current_question', status: 'returned' });
    } else if (action === 'progress') {
      toolsCalled.push('get_mock_progress');
      this.log(sessionId, 'agent.tool_call', { tool: 'get_mock_progress' });
      this.log(sessionId, 'tool.get_mock_progress', {});
      this.progress(sessionId);
      this.log(sessionId, 'agent.tool_result', { tool: 'get_mock_progress', status: 'returned' });
    }

    this.log(sessionId, 'agent.finish', { called_tools: toolsCalled });

    const nextQ = this.currentQuestion(sessionId);
    const prog = this.progress(sessionId);

    return {
      message: nextQ
        ? `Saved response and retrieved Part ${nextQ.part} Question ${nextQ.number}/${nextQ.total}.`
        : 'All 8 questions completed. Mock test finished.',
      tools_called: toolsCalled,
      question: nextQ,
      progress: prog,
    };
  }

  private generateHexId(): string {
    const chars = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < 32; i++) {
      out += chars[Math.floor(Math.random() * 16)];
    }
    return out;
  }
}

export function createDemoSeedSessions(): SessionRecord[] {
  const store = new SpeakingStore();
  // 1. Active session at Part 1 Question 2 (shows follow-up personalization from Question 1!)
  const sid1 = store.startSession('minh_anh_uit', 'study', 'a1b2c3d4e5f60718293a4b5c6d7e8f90');
  store.runAgent(sid1, 'start');
  store.runAgent(sid1, 'submit', {
    questionId: 'st-p1-01',
    answer: 'I am a third-year university student in Ho Chi Minh City. Every morning I attend lectures and in the evening I practice English with my friends online.',
  });

  // 2. Session positioned right at Part 2 Cue Card so user can immediately inspect/demo Part 2 Cue Card UI!
  const sid2 = store.startSession('minh_anh_uit', 'technology', 'f0e1d2c3b4a5968778695a4b3c2d1e0f');
  store.runAgent(sid2, 'start');
  store.runAgent(sid2, 'submit', {
    questionId: 'te-p1-01',
    answer: 'I use technology almost every hour of the day, especially my laptop and smartphone for online study and coding projects.',
  });
  store.runAgent(sid2, 'submit', {
    questionId: 'te-p1-02',
    answer: 'Learning online makes a huge difference because I can access international courses and collaborate with classmates from anywhere.',
  });
  store.runAgent(sid2, 'submit', {
    questionId: 'te-p1-03',
    answer: 'I prefer communicating face to face with close friends for deep conversations, though online messaging is much faster for daily group work.',
  });

  // 3. Session positioned right at Part 3 Discussion (Question 6/8)
  const sid3 = store.startSession('minh_anh_uit', 'study', 'c9d8e7f6a5b4c3d2e1f09876543210ab');
  store.runAgent(sid3, 'start');
  const part1And2Answers: [string, string][] = [
    ['st-p1-01', 'I am a university student in Ho Chi Minh City and I practice English with my friends every evening.'],
    ['st-p1-02', 'Spending time with friends keeps me happy and motivated to speak more naturally.'],
    ['st-p1-03', 'I love the feeling of discovering new perspectives and applying new skills to daily projects.'],
    ['st-p2-01', 'I would love to learn public speaking in English. I plan to practice weekly with my teacher and friends in our university club so I can present my graduation project confidently in the future.'],
    ['st-p2-02', 'The hardest part of regular practice is staying calm when answering unexpected questions in front of a large crowd.'],
  ];
  for (const [qid, ans] of part1And2Answers) {
    store.runAgent(sid3, 'submit', { questionId: qid, answer: ans });
  }

  const all = store.getAllSessions();
  const s1 = all.find((s) => s.id === sid1)!;
  const s2 = all.find((s) => s.id === sid2)!;
  const s3 = all.find((s) => s.id === sid3)!;
  s1.created_at = '2026-10-25T16:30:00.000Z';
  s2.created_at = '2026-10-25T16:15:00.000Z';
  s3.created_at = '2026-10-25T16:00:00.000Z';
  return [s1, s2, s3];
}
