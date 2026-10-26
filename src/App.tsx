/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, RotateCcw, ChevronDown, ChevronUp, Check, Copy, Volume2, VolumeX } from 'lucide-react';

// Exact data contract from ui_backend.py
export interface BackendState {
  session_id: string;
  reply: string;
  part: 1 | 2 | 3;
  answered: number;
  total: number;
  finished: boolean;
  cue_card: string | null;
  tools: string[];
  feedback: string | null;
}

const STEPS: [1 | 2 | 3, string, string | null][] = [
  // Part 1: 4–6 câu hỏi (5 câu) về bản thân và chủ đề quen thuộc
  [1, 'Are you a student or do you work? Tell me a little about what you do.', null],
  [1, 'What does your typical daily routine look like?', null],
  [1, 'Do you enjoy studying English, and how do you usually practice it?', null],
  [1, 'What do you usually do in your free time to relax?', null],
  [1, 'Do you prefer spending your free time alone or with friends? Why?', null],
  // Part 2: Đưa cue card, cho 1 phút chuẩn bị, người học trả lời một lượt dài
  [
    2,
    "Now I'd like you to talk about the topic on the card. You have 1 minute to prepare, and then you should speak for 1 to 2 minutes.",
    'Describe a skill you learned recently.\n- what the skill is\n- when and how you learned it\n- what challenges you faced while learning it\n- and explain why this skill was useful to you',
  ],
  // Part 3: 4–6 câu hỏi (5 câu) thảo luận, trong đó có câu hỏi đào sâu dựa trên chính câu trả lời trước của người học
  [3, 'Why do you think people today want to learn new skills throughout their lives?', null],
  [
    3,
    'In your previous answer, you mentioned {anchor}. Why do you think that plays such an important role when people learn a new skill?',
    null,
  ],
  [
    3,
    'Do you think schools and universities should focus more on practical life skills than traditional academic subjects? Why?',
    null,
  ],
  [
    3,
    'Building on what you said about {anchor}, can you give a concrete real-life example and consider an opposing point of view?',
    null,
  ],
  [
    3,
    'How might artificial intelligence and digital technology change the way people learn new skills in the next ten years?',
    null,
  ],
];

function extractAnchorFromAnswer(rawAnswer: string): string {
  const cleaned = rawAnswer.trim();
  if (!cleaned) return 'that point';

  const lower = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const keywordPatterns: [RegExp, string][] = [
    [/\b(?:job|jobs|career|work|employ|promotion)\b/, 'career and job opportunities'],
    [/\b(?:friend|friends|social)\b/, 'learning and socializing with friends'],
    [/\b(?:famil(?:y|ies)|parent|parents)\b/, 'support from family'],
    [/\b(?:online|internet|video|youtube|app|apps)\b/, 'learning online'],
    [/\b(?:teacher|teachers|mentor|instructor)\b/, 'guidance from teachers'],
    [/\b(?:practice|practising|practicing|habit)\b/, 'regular practice'],
    [/\b(?:tech|technology|ai|computer|digital)\b/, 'modern technology'],
    [/\b(?:confident|confidence|self[-\s]?esteem)\b/, 'building personal confidence'],
    [/\b(?:time|schedule|busy)\b/, 'managing time effectively'],
    [/\b(?:money|salary|income|financial)\b/, 'financial benefits'],
    [/\b(?:practical|real[-\s]?life|hands[-\s]?on)\b/, 'practical real-life skills'],
    [/\b(?:academic|theory|theoretical|exam|exams)\b/, 'academic knowledge'],
    [/\b(?:school|university|college|education)\b/, 'formal education at school'],
    [/\b(?:communicat(?:e|ion)|speaking|language)\b/, 'communication skills'],
  ];

  for (const [regex, label] of keywordPatterns) {
    if (regex.test(lower)) {
      return label;
    }
  }

  // Fallback: extract a short meaningful snippet directly from the learner's own sentence
  const withoutLeadIn = cleaned
    .replace(/^(?:i think(?:\s+that)?|in my opinion|for me|well|yes|no|because|since)\s+/i, '')
    .trim();
  const firstClause = withoutLeadIn.split(/[.!?;,]/)[0].trim();
  const words = firstClause.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const snippet = words.slice(0, 6).join(' ');
    return `"${snippet}${words.length > 6 ? '...' : ''}"`;
  }

  return 'that point';
}

function getPartIndices(part: 1 | 2 | 3): number[] {
  return STEPS.map((s, idx) => (s[0] === part ? idx : -1)).filter((idx) => idx !== -1);
}

function getFirstIndexForPart(part: 1 | 2 | 3): number {
  const found = STEPS.findIndex((s) => s[0] === part);
  return found >= 0 ? found : 0;
}

function resolveQuestionText(idx: number, answers: Record<number, string>): string {
  const template = STEPS[idx]?.[1] || '';
  if (!template.includes('{anchor}')) return template;

  // Look at the immediately preceding question's answer (or fallback to any previous answer)
  let sourceAns = (answers[idx - 1] || '').trim();
  if (!sourceAns) {
    for (let i = idx - 2; i >= 0; i--) {
      if ((answers[i] || '').trim()) {
        sourceAns = answers[i].trim();
        break;
      }
    }
  }
  return template.replace('{anchor}', extractAnchorFromAnswer(sourceAns));
}

const DISCLAIMER =
  'Nhận xét chỉ dùng để luyện tập, không phải điểm IELTS chính thức. Chế độ text không đánh giá phát âm.';

const PART_INFO: Record<1 | 2 | 3, string> = {
  1: '🌸 Part 1: 4–6 câu hỏi về bản thân và chủ đề quen thuộc (trả lời 2–3 câu mỗi câu hỏi).',
  2: '🎤 Part 2: Đưa cue card, 1 phút chuẩn bị, người học trả lời một lượt dài (1–2 phút).',
  3: '✨ Part 3: 4–6 câu hỏi thảo luận mở rộng, có câu hỏi đào sâu dựa trên câu trả lời trước.',
};

const PART_INTRO_DETAILS: Record<
  1 | 2 | 3,
  {
    badge: string;
    title: string;
    duration: string;
    description: string;
    tips: string[];
  }
> = {
  1: {
    badge: 'Part 1 · Introduction',
    title: 'Giới thiệu & Làm quen',
    duration: '4–5 phút gợi ý · 5 câu hỏi (4–6 câu)',
    description:
      'Giám khảo sẽ đặt 4–6 câu hỏi quen thuộc về bản thân, việc học tập, sở thích và thói quen hằng ngày của bạn.',
    tips: [
      'Trả lời ngắn gọn từ 2–3 câu cho mỗi câu hỏi, tránh chỉ trả lời Yes/No.',
      'Mở rộng câu trả lời bằng một lý do ngắn hoặc chi tiết cá nhân.',
      'Đồng hồ tính thời gian làm bài Part 1 sẽ bắt đầu ngay khi bạn bấm nút bên dưới.',
    ],
  },
  2: {
    badge: 'Part 2 · Long Turn',
    title: 'Nói độc thoại theo chủ đề - cue card',
    duration: '1 phút chuẩn bị · Trả lời một lượt dài (1–2 phút)',
    description:
      'Bạn sẽ nhận được một thẻ chủ đề (Cue card) kèm các gợi ý. Bạn có 1 phút chuẩn bị ý tưởng trước khi trả lời một lượt dài.',
    tips: [
      'Đọc kỹ câu chủ đề và 4 gạch đầu dòng gợi ý trên thẻ Cue card.',
      'Viết một lượt trả lời dài mạch lạc có mở đầu, nội dung chính và cảm nghĩ kết luận.',
      'Đồng hồ tính thời gian làm bài và 1 phút chuẩn bị sẽ bắt đầu khi bạn bấm nút bên dưới.',
    ],
  },
  3: {
    badge: 'Part 3 · Discussion',
    title: 'Thảo luận mở rộng & Đào sâu',
    duration: '4–5 phút gợi ý · 5 câu hỏi thảo luận',
    description:
      'Giám khảo sẽ hỏi 4–6 câu hỏi thảo luận mở rộng, trong đó có các câu hỏi đào sâu dựa trực tiếp trên câu trả lời trước của bạn.',
    tips: [
      'Nêu rõ quan điểm, giải thích nguyên nhân (Why) và kết quả (Effect).',
      'Các câu hỏi đào sâu sẽ tự động bám sát ý bạn vừa viết ở câu trước.',
      'Đưa thêm ví dụ thực tế để câu trả lời thuyết phục hơn (khoảng 3–5 câu).',
    ],
  },
};

const PART_TRANSITION_MSG: Record<number, string> = {
  2: "Now, let's move on to Part 2. Please read the cue card carefully.",
  3: "Now, let's move on to Part 3 and discuss some broader questions.",
};

function countWords(text: string): number {
  const cleaned = text.trim();
  return cleaned ? cleaned.split(/\s+/).length : 0;
}

function formatMMSS(totalSeconds: number): string {
  const abs = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ExaminerMascotSvg: React.FC = () => (
  <svg
    width="56"
    height="56"
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Examiner Mascot"
    className="shrink-0"
  >
    <circle cx="32" cy="34" r="26" fill="#FFE0EC" stroke="#FF6FA5" strokeWidth="2.5" />
    <ellipse
      cx="22"
      cy="14"
      rx="5.5"
      ry="11"
      transform="rotate(-10 22 14)"
      fill="#FFFFFF"
      stroke="#FF6FA5"
      strokeWidth="2.2"
    />
    <ellipse
      cx="22"
      cy="14"
      rx="2.8"
      ry="7"
      transform="rotate(-10 22 14)"
      fill="#FFB3CE"
    />
    <ellipse
      cx="42"
      cy="14"
      rx="5.5"
      ry="11"
      transform="rotate(10 42 14)"
      fill="#FFFFFF"
      stroke="#FF6FA5"
      strokeWidth="2.2"
    />
    <ellipse
      cx="42"
      cy="14"
      rx="2.8"
      ry="7"
      transform="rotate(10 42 14)"
      fill="#FFB3CE"
    />
    <circle cx="32" cy="36" r="17" fill="#FFFFFF" stroke="#FF6FA5" strokeWidth="2.2" />
    <path
      d="M14 35C14 25 22 19 32 19C42 19 50 25 50 35"
      stroke="#E04A86"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <rect x="11" y="31" width="5" height="10" rx="2.5" fill="#FF6FA5" />
    <rect x="48" y="31" width="5" height="10" rx="2.5" fill="#FF6FA5" />
    <circle cx="25.5" cy="35" r="2.2" fill="#5B2B3F" />
    <circle cx="38.5" cy="35" r="2.2" fill="#5B2B3F" />
    <ellipse cx="21.5" cy="38.5" rx="3" ry="1.8" fill="#FFB3CE" />
    <ellipse cx="42.5" cy="38.5" rx="3" ry="1.8" fill="#FFB3CE" />
    <path
      d="M29.5 40.5Q32 43 34.5 40.5"
      stroke="#5B2B3F"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default function App() {
  // Mirrors ui_backend.py _sessions state
  const [sessions, setSessions] = useState<Record<string, number>>({});
  const [state, setState] = useState<BackendState | null>(null);
  const [chat, setChat] = useState<[role: 'assistant' | 'user', msg: string][]>([]);
  const [answerBox, setAnswerBox] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shortNotice, setShortNotice] = useState<string | null>(null);
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);

  // Selected practice mode from the 4 main options: 'full' | 1 | 2 | 3
  const [selectedMode, setSelectedMode] = useState<'full' | 1 | 2 | 3>('full');

  // Whether the current Part has been started
  const [partStarted, setPartStarted] = useState(false);

  // Elapsed active time (in seconds) per Part: { 1: sec, 2: sec, 3: sec }
  const [partSeconds, setPartSeconds] = useState<Record<1 | 2 | 3, number>>({
    1: 0,
    2: 0,
    3: 0,
  });

  // Notes / outline box toggle and content per question index (0..3)
  const [openNotes, setOpenNotes] = useState<Record<number, boolean>>({});
  const [notesByIdx, setNotesByIdx] = useState<Record<number, string>>({});
  // Answers typed per question index (0..3) so multi-question Parts (like Part 1) work smoothly
  const [answersByIdx, setAnswersByIdx] = useState<Record<number, string>>({});
  // Review flags when clicking question number circle
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  // Highlight toggle
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  // Saved draft notification
  const [saveDraftNotice, setSaveDraftNotice] = useState<string | null>(null);
  // Currently speaking question index for TTS audio playback
  const [speakingQuestionIdx, setSpeakingQuestionIdx] = useState<number | null>(null);
  // Toggle question transcript visibility per question index
  const [openTranscripts, setOpenTranscripts] = useState<Record<number, boolean>>({});

  // Part 2 Timer ('prep' 60s -> 'speak' 120s)
  const [p2Phase, setP2Phase] = useState<'prep' | 'speak' | null>(null);
  const [p2Elapsed, setP2Elapsed] = useState(0);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeakQuestion = (qIdx: number, questionText: string, cueText?: string | null) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingQuestionIdx === qIdx) {
      window.speechSynthesis.cancel();
      setSpeakingQuestionIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    const fullText = cueText ? `${questionText} ${cueText.replace(/\n/g, '. ')}` : questionText;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.startsWith('en') && /female|samantha|google|zira|victoria/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setSpeakingQuestionIdx((prev) => (prev === qIdx ? null : prev));
    };
    utterance.onerror = () => {
      setSpeakingQuestionIdx((prev) => (prev === qIdx ? null : prev));
    };

    setSpeakingQuestionIdx(qIdx);
    window.speechSynthesis.speak(utterance);
  };

  // Tick elapsed time for the active Part only AFTER entering the exam page
  useEffect(() => {
    if (!state || state.finished || !partStarted) return;
    const currentPart = state.part;
    const interval = setInterval(() => {
      setPartSeconds((prev) => ({
        ...prev,
        [currentPart]: prev[currentPart] + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [state, partStarted]);

  useEffect(() => {
    if (!p2Phase || !state || state.part !== 2 || state.finished || !partStarted) return;
    const interval = setInterval(() => {
      setP2Elapsed((prev) => {
        const next = prev + 1;
        if (p2Phase === 'prep' && next >= 60) {
          setP2Phase('speak');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [p2Phase, state, partStarted]);

  const makeBackendResponse = (
    sid: string,
    idx: number,
    reply: string,
    finished: boolean
  ): BackendState => {
    const [part, , cue] = STEPS[Math.min(idx, STEPS.length - 1)];
    return {
      session_id: sid,
      reply,
      part,
      answered: idx,
      total: STEPS.length,
      finished,
      cue_card: finished ? null : cue,
      tools: ['save_answer', 'get_question'],
      feedback: finished
        ? 'Bạn đã hoàn thành phần luyện tập. Đây là bản demo, chưa có nhận xét chi tiết.'
        : null,
    };
  };

  // Start any of the 4 options ('full' | 1 | 2 | 3) and go straight to its Exam Page
  const handleSelectOption = (mode: 'full' | 1 | 2 | 3) => {
    try {
      const nextSid = String(Object.keys(sessions).length + 1);
      const startIdx =
        mode === 'full' || mode === 1
          ? getFirstIndexForPart(1)
          : mode === 2
            ? getFirstIndexForPart(2)
            : getFirstIndexForPart(3);
      setSelectedMode(mode);
      setSessions((prev) => ({ ...prev, [nextSid]: startIdx }));
      const initial = makeBackendResponse(nextSid, startIdx, STEPS[startIdx][1], false);
      setState(initial);
      setChat([['assistant', initial.reply]]);
      setAnswerBox('');
      setAnswersByIdx({});
      setNotesByIdx({});
      setOpenNotes({});
      setOpenTranscripts({});
      setFlaggedQuestions({});
      setError(null);
      setShortNotice(null);
      setTransitionMsg(null);
      // Đưa thẳng tới trang làm bài của lựa chọn đó và bắt đầu tính thời gian
      setPartStarted(true);
      setPartSeconds({ 1: 0, 2: 0, 3: 0 });
      if (initial.part === 2) {
        setP2Phase('prep');
        setP2Elapsed(0);
      } else {
        setP2Phase(null);
        setP2Elapsed(0);
      }
    } catch {
      setError('Không thể bắt đầu bài thi lúc này. Bạn vui lòng bấm thử lại nhé!');
    }
  };

  const handleStartCurrentPart = () => {
    if (!state) return;
    setPartStarted(true);
    setError(null);
    if (state.part === 2 && !p2Phase) {
      setP2Phase('prep');
      setP2Elapsed(0);
    }
  };

  const handleReset = () => {
    setState(null);
    setChat([]);
    setAnswerBox('');
    setAnswersByIdx({});
    setNotesByIdx({});
    setOpenNotes({});
    setOpenTranscripts({});
    setFlaggedQuestions({});
    setError(null);
    setShortNotice(null);
    setTransitionMsg(null);
    setPartStarted(false);
    setPartSeconds({ 1: 0, 2: 0, 3: 0 });
    setP2Phase(null);
    setP2Elapsed(0);
  };

  const toggleFlagQuestion = (qIdx: number) => {
    setFlaggedQuestions((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const toggleNoteBox = (qIdx: number) => {
    setOpenNotes((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const toggleTranscript = (qIdx: number) => {
    setOpenTranscripts((prev) => ({ ...prev, [qIdx]: !prev[qIdx] }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(
        'speaking_practice_draft',
        JSON.stringify({ answersByIdx, notesByIdx, answerBox, savedAt: new Date().toISOString() })
      );
      setSaveDraftNotice('Đã lưu bài làm tạm thời!');
      setTimeout(() => setSaveDraftNotice(null), 2500);
    } catch {
      setSaveDraftNotice('Đã ghi nhận bản nháp trên phiên hiện tại!');
      setTimeout(() => setSaveDraftNotice(null), 2500);
    }
  };

  const handleSubmitQuestion = (qIdx: number, customText?: string) => {
    if (!state) return;
    const raw = customText !== undefined ? customText : answersByIdx[qIdx] ?? answerBox;
    const text = raw.trim();
    if (!text) {
      setError(`Bạn chưa nhập câu trả lời cho Câu ${qIdx + 1}! Hãy gõ vài câu tiếng Anh trước nhé.`);
      return;
    }

    const words = countWords(text);
    setShortNotice(
      words < 3
        ? 'Hãy thử nói dài hơn một chút nhé (từ 2–3 câu sẽ giúp luyện phản xạ tốt hơn)!'
        : null
    );

    const updatedAnswers = { ...answersByIdx, [qIdx]: text };
    setAnswersByIdx(updatedAnswers);

    const nextIdx = Math.max(state.answered, qIdx + 1);
    setSessions((prev) => ({ ...prev, [state.session_id]: nextIdx }));

    const qText = resolveQuestionText(qIdx, updatedAnswers);
    setError(null);
    setChat((prev) => {
      const nextChat = [...prev];
      if (!nextChat.some(([r, m]) => r === 'assistant' && m === qText)) {
        nextChat.push(['assistant', qText]);
      }
      nextChat.push(['user', text]);
      return nextChat;
    });
    setAnswerBox('');
  };

  const handleContinueNextPart = () => {
    if (!state) return;

    // Ghi nhận tự động các câu trả lời đã nhập ở Part hiện tại vào lịch sử hội thoại
    const currentPartIndices = getPartIndices(state.part);
    const updatedChat: [role: 'assistant' | 'user', msg: string][] = [...chat];
    currentPartIndices.forEach((idx) => {
      const qText = resolveQuestionText(idx, answersByIdx);
      const ans = (answersByIdx[idx] || '').trim();
      if (ans && !updatedChat.some(([r, m]) => r === 'user' && m === ans)) {
        if (!updatedChat.some(([r, m]) => r === 'assistant' && m === qText)) {
          updatedChat.push(['assistant', qText]);
        }
        updatedChat.push(['user', ans]);
      }
    });
    setChat(updatedChat);

    // Chuyển sang Part tiếp theo nếu đang ở Part 1 hoặc Part 2; nếu ở Part 3 thì hoàn thành bài thi
    if (selectedMode === 'full' && state.part < 3) {
      const nextPart = (state.part + 1) as 2 | 3;
      const targetIdx = getFirstIndexForPart(nextPart);
      const nextState = makeBackendResponse(
        state.session_id,
        targetIdx,
         resolveQuestionText(targetIdx, answersByIdx),
        false
      );
      setTransitionMsg(PART_TRANSITION_MSG[nextPart] || null);
      setState(nextState);
      setError(null);
      setShortNotice(null);
      setPartStarted(true);
      if (nextPart === 2) {
        setP2Phase('prep');
        setP2Elapsed(0);
      } else {
        setP2Phase(null);
        setP2Elapsed(0);
      }
    } else {
      handleFinishExamNow();
    }
  };

  const handleFinishExamNow = () => {
    if (!state) return;
    const relevantIndices =
      selectedMode === 'full'
        ? STEPS.map((_, i) => i)
        : getPartIndices(selectedMode);

    const newChatEntries: [role: 'assistant' | 'user', msg: string][] = [...chat];
    relevantIndices.forEach((idx) => {
      const qText = resolveQuestionText(idx, answersByIdx);
      const ans = (answersByIdx[idx] || '').trim();
      if (ans && !newChatEntries.some(([r, m]) => r === 'user' && m === ans)) {
        if (!newChatEntries.some(([r, m]) => r === 'assistant' && m === qText)) {
          newChatEntries.push(['assistant', qText]);
        }
        newChatEntries.push(['user', ans]);
      }
    });
    const answeredCount = relevantIndices.filter(
      (idx) => Boolean((answersByIdx[idx] || '').trim())
    ).length;

    const finishedState: BackendState = {
      ...makeBackendResponse(
        state.session_id,
        answeredCount || relevantIndices.length,
        'Thank you. That is the end of the test.',
        true
      ),
      total: relevantIndices.length,
    };
    setChat(newChatEntries);
    setState(finishedState);
    setP2Phase(null);
    setP2Elapsed(0);
  };

  const handleSkipPrep = () => {
    setP2Phase('speak');
    setP2Elapsed(0);
  };

  const handleSwitchPartInFullTest = (targetPart: 1 | 2 | 3) => {
    if (!state) return;
    const targetIdx = getFirstIndexForPart(targetPart);
    const jumpedState = makeBackendResponse(
      state.session_id,
      targetIdx,
      resolveQuestionText(targetIdx, answersByIdx),
      false
    );
    setState(jumpedState);
    setError(null);
    setShortNotice(null);
    setPartStarted(true);
    if (targetPart === 2) {
      setP2Phase('prep');
      setP2Elapsed(0);
    } else {
      setP2Phase(null);
      setP2Elapsed(0);
    }
  };

  const buildTranscriptText = (): string => {
    return chat
      .map(([role, msg]) => `${role === 'assistant' ? 'Examiner' : 'Candidate'}: ${msg}`)
      .join('\n\n');
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([buildTranscriptText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'speaking_transcript.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isExamRoomActive = Boolean(state && !state.finished && partStarted);
  const totalElapsedSeconds = partSeconds[1] + partSeconds[2] + partSeconds[3];

  const examHeaderTitle =
    selectedMode === 'full'
      ? 'Speaking Practice · Full Test (Part 1 - 2 - 3)'
      : selectedMode === 1
      ? 'Speaking Practice · Làm Part 1 (Giới thiệu & Làm quen)'
      : selectedMode === 2
      ? 'Speaking Practice · Làm Part 2 (Nói độc thoại - Cue card)'
      : 'Speaking Practice · Làm Part 3 (Thảo luận mở rộng)';

  return (
    <div className="min-h-screen bg-[#FFF5F9] text-[#5B2B3F] flex flex-col">
      {/* Top Bar: switches to centered Exam Header with "Thoát" button when in active Exam Room */}
      {isExamRoomActive && state ? (
        <header className="flex items-center justify-center gap-3 px-6 py-3 bg-white border-b-2 border-[#FFE0EC] shadow-2xs">
          <h1 className="text-lg font-bold text-[#5B2B3F]">{examHeaderTitle}</h1>
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1 text-xs font-bold text-[#5B2B3F] bg-[#FFF5F9] hover:bg-[#FFE0EC] border border-[#FFB8D2] rounded-lg transition-colors cursor-pointer"
          >
            Thoát
          </button>
        </header>
      ) : (
        <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white border-b-2 border-[#FFE0EC]">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleReset();
            }}
            className="text-lg font-bold text-[#5B2B3F] whitespace-nowrap shrink-0"
          >
            🎀 Speaking Practice
          </a>
        </header>
      )}

      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 space-y-4 ${
          isExamRoomActive ? 'max-w-[1220px]' : 'max-w-[840px]'
        }`}
      >
        {/* ==================== 1) MÀN HÌNH CHÍNH VỚI 4 LỰA CHỌN ==================== */}
        {state === null ? (
          <div className="space-y-5">
            <div
              className="rounded-3xl border-2 border-[#FFE0EC] p-7 text-center space-y-2 shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE0EC 100%)',
              }}
            >
              <div className="flex justify-center mb-2">
                <ExaminerMascotSvg />
              </div>
              <h1 className="text-3xl font-bold text-[#5B2B3F]">🎀 Speaking Practice</h1>
              <p className="text-base font-semibold text-[#A56A82]">
                Chọn chế độ luyện tập bên dưới để mở thẳng trang làm bài tương ứng
              </p>
            </div>

            {/* 4 LỰA CHỌN CHÍNH: Làm Full Test, Làm Part 1, Làm Part 2, Làm Part 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  mode: 'full' as const,
                  badge: '🌸 Full Test',
                  title: 'Full Test (Đầy đủ 3 Part)',
                  meta: '11–14 phút gợi ý · Questions 1–11',
                  desc: 'Làm trọn vẹn bài thi nói qua cả 3 phần: Part 1 (5 câu hỏi quen thuộc), Part 2 (Cue card + 1 phút chuẩn bị) và Part 3 (5 câu thảo luận & đào sâu).',
                  btnLabel: '🎤 Bắt đầu làm bài',
                },
                {
                  mode: 1 as const,
                  badge: '💬 Part 1',
                  title: 'Part 1 (Giới thiệu & Làm quen)',
                  meta: '4–5 phút gợi ý · 5 câu hỏi (4–6 câu)',
                  desc: '4–6 câu hỏi về bản thân và chủ đề quen thuộc (học tập, công việc, thói quen hằng ngày, sở thích).',
                  btnLabel: '🎤 Bắt đầu làm bài',
                },
                {
                  mode: 2 as const,
                  badge: '🗂️ Part 2',
                  title: 'Part 2 (Nói độc thoại theo chủ đề - cue card)',
                  meta: '1 phút chuẩn bị · Trả lời một lượt dài',
                  desc: 'Đưa thẻ chủ đề (Cue card), cho 1 phút chuẩn bị dàn ý, sau đó người học trả lời một lượt dài (1–2 phút).',
                  btnLabel: '🎤 Bắt đầu làm bài',
                },
                {
                  mode: 3 as const,
                  badge: '✨ Part 3',
                  title: 'Part 3 (Thảo luận mở rộng)',
                  meta: '4–5 phút gợi ý · 5 câu hỏi (4–6 câu)',
                  desc: '4–6 câu hỏi thảo luận mở rộng, trong đó có câu hỏi đào sâu dựa trên chính câu trả lời trước của người học.',
                  btnLabel: '🎤 Bắt đầu làm bài',
                },
              ].map((option) => (
                <div
                  key={String(option.mode)}
                  onClick={() => handleSelectOption(option.mode)}
                  className="bg-white border-2 border-[#FFE0EC] hover:border-[#FF6FA5] rounded-[22px] p-5 flex flex-col justify-between space-y-4 shadow-2xs transition-all cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-block bg-[#FFE0EC] text-[#E04A86] text-xs font-bold px-3 py-1 rounded-full">
                        {option.badge}
                      </span>
                      <span className="text-xs font-bold text-[#A56A82]">{option.meta}</span>
                    </div>
                    <h2 className="text-lg font-bold text-[#5B2B3F]">{option.title}</h2>
                    <p className="text-sm font-semibold text-[#A56A82] leading-relaxed">
                      {option.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectOption(option.mode);
                    }}
                    className="w-full py-2.5 px-4 text-sm font-bold text-white bg-[#FF6FA5] hover:bg-[#E04A86] rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    {option.btnLabel}
                  </button>
                </div>
              ))}
            </div>

            {/* Danh sách lưu ý ngắn dạng checklist */}
            <div className="bg-white border-2 border-[#FFE0EC] rounded-[20px] p-5 space-y-2 shadow-2xs">
              <div className="text-base font-bold text-[#5B2B3F]">
                ✨ Lưu ý nhỏ trước khi vào phòng thi:
              </div>
              <ul className="space-y-1.5 text-sm sm:text-base font-semibold text-[#5B2B3F]">
                <li>✅ Trả lời hoàn toàn bằng văn bản tiếng Anh (không cần thu âm).</li>
                <li>✅ Chế độ văn bản giúp rèn ý tưởng &amp; từ vựng, không chấm phát âm.</li>
                <li>✅ Part 1 (4–6 câu quen thuộc), Part 2 (Cue card + 1 phút chuẩn bị, trả lời dài), Part 3 (4–6 câu thảo luận &amp; đào sâu từ câu trả lời trước).</li>
              </ul>
            </div>

            {error && (
              <div
                role="alert"
                className="bg-[#FFE8EC] border-2 border-[#FF7A8A] text-[#5B2B3F] rounded-[18px] px-4 py-3 text-sm font-bold"
              >
                {error}
              </div>
            )}
          </div>
        ) : state.finished ? (
          /* ==================== 4) MÀN HÌNH KẾT THÚC ==================== */
          <div className="space-y-5">
            <div
              className="rounded-3xl border-2 border-[#FFE0EC] p-7 text-center space-y-2 shadow-xs"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE0EC 100%)',
              }}
            >
              <h2 className="text-2xl font-bold text-[#5B2B3F]">
                ✨ Chúc mừng bạn đã hoàn thành bài luyện tập!
              </h2>
              <p className="text-base font-semibold text-[#5B2B3F]">
                Chế độ:{' '}
                <strong>
                  {selectedMode === 'full' ? 'Full Test (3 Part)' : `Luyện riêng Part ${selectedMode}`}
                </strong>{' '}
                · Đã hoàn thành{' '}
                <strong>
                  {state.answered}/{state.total}
                </strong>{' '}
                câu hỏi.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-bold text-[#E04A86] tabular-nums">
                <span className="bg-white border border-[#FFE0EC] px-3.5 py-1.5 rounded-full">
                  ⏱️ Tổng thời gian làm bài: {formatMMSS(totalElapsedSeconds)}
                </span>
                {(selectedMode === 'full' || selectedMode === 1) && (
                  <span className="bg-white border border-[#FFE0EC] px-3 py-1.5 rounded-full text-[#5B2B3F]">
                    Part 1: {formatMMSS(partSeconds[1])}
                  </span>
                )}
                {(selectedMode === 'full' || selectedMode === 2) && (
                  <span className="bg-white border border-[#FFE0EC] px-3 py-1.5 rounded-full text-[#5B2B3F]">
                    Part 2: {formatMMSS(partSeconds[2])}
                  </span>
                )}
                {(selectedMode === 'full' || selectedMode === 3) && (
                  <span className="bg-white border border-[#FFE0EC] px-3 py-1.5 rounded-full text-[#5B2B3F]">
                    Part 3: {formatMMSS(partSeconds[3])}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white border-2 border-[#FFE0EC] rounded-[18px] p-4 text-base font-semibold text-[#5B2B3F]">
              🎀 <strong>Nhận xét luyện tập:</strong>{' '}
              {state.feedback || 'Nhận xét chi tiết sẽ có khi kết nối agent'}
            </div>

            {/* Toàn bộ hội thoại trái/phải */}
            <div className="bg-white border-2 border-[#FFE0EC] rounded-[20px] p-5 space-y-3">
              <div className="text-base font-bold text-[#5B2B3F]">
                💬 Toàn bộ hội thoại của bạn
              </div>
              <div className="space-y-2.5">
                {chat.map(([role, msg], idx) => (
                  <div
                    key={idx}
                    className={`flex ${role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[82%] px-4 py-2.5 rounded-[18px] text-base font-semibold leading-snug ${
                        role === 'assistant'
                          ? 'bg-[#FFF5F9] border border-[#FFE0EC] text-[#5B2B3F] rounded-bl-md'
                          : 'bg-[#FFE0EC] border border-[#FFB8D2] text-[#5B2B3F] rounded-br-md'
                      }`}
                    >
                      <strong>{role === 'assistant' ? 'Giám khảo' : 'Bạn'}:</strong> {msg}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadTranscript}
                className="py-3 px-5 text-base font-bold text-[#5B2B3F] bg-white hover:bg-[#FFE0EC] border-2 border-[#FFE0EC] rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Tải transcript (.txt)</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="py-3 px-5 text-base font-bold text-white bg-[#FF6FA5] hover:bg-[#E04A86] rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>🌸 Chọn bài luyện tập khác</span>
              </button>
            </div>
          </div>
        ) : !partStarted ? (
          /* ==================== MÀN HÌNH GIỚI THIỆU PART ==================== */
          (() => {
            const intro = PART_INTRO_DETAILS[state.part];
            return (
              <div className="space-y-4">
                <div
                  className="rounded-3xl border-2 border-[#FFE0EC] p-6 space-y-4 shadow-xs"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF0F6 100%)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <ExaminerMascotSvg />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-block bg-[#FFE0EC] text-[#E04A86] text-xs font-bold px-3.5 py-1 rounded-full">
                          🌸 {intro.badge}
                        </span>
                        <span className="inline-block bg-white border border-[#FFE0EC] text-[#A56A82] text-xs font-bold px-3 py-1 rounded-full">
                          ⏱️ {intro.duration}
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-[#5B2B3F]">{intro.title}</h2>
                      <p className="text-base font-semibold text-[#5B2B3F] leading-relaxed">
                        {intro.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartCurrentPart}
                    className="w-full py-3.5 px-6 text-base font-bold text-white bg-[#FF6FA5] hover:bg-[#E04A86] rounded-full transition-colors cursor-pointer shadow-sm"
                  >
                    🎤 Bắt đầu làm bài Part {state.part}
                  </button>
                </div>
              </div>
            );
          })()
        ) : (
          /* ==================== TRANG BÀI LÀM 2 CỘT CỦA TỪNG LỰA CHỌN ==================== */
          (() => {
            const partQuestions = STEPS.map((step, idx) => ({
              idx,
              num: idx + 1,
              part: step[0],
              rawTemplate: step[1],
              question: resolveQuestionText(idx, answersByIdx),
              isFollowUp: step[1].includes('{anchor}'),
              cue: step[2],
            })).filter((q) => q.part === state.part);

            const examinerGreeting =
              state.part === 1
                ? 'Hi. I’m Pippi, your examiner for Part 1 of the IELTS Speaking test today. We’ll focus on simple, everyday topics.'
                : state.part === 2
                  ? 'Hi. I’m Pippi, your examiner for Part 2 of the IELTS Speaking test today. You’ll have 1 minute to prepare and 1–2 minutes to speak about the topic.'
                  : 'Hi. I’m Pippi, your examiner for Part 3 of the IELTS Speaking test today. We’ll discuss some broader, more abstract questions.';

            const p1Indices = getPartIndices(1);
            const p2Indices = getPartIndices(2);
            const p3Indices = getPartIndices(3);

            const sidebarGroups = [
              {
                label: `Part 1 (Questions ${p1Indices[0] + 1}-${p1Indices[p1Indices.length - 1] + 1})`,
                partNum: 1 as const,
                indices: p1Indices,
              },
              {
                label: `Part 2 (Question ${p2Indices[0] + 1})`,
                partNum: 2 as const,
                indices: p2Indices,
              },
              {
                label: `Part 3 (Questions ${p3Indices[0] + 1}-${p3Indices[p3Indices.length - 1] + 1})`,
                partNum: 3 as const,
                indices: p3Indices,
              },
            ].filter((g) => selectedMode === 'full' || g.partNum === selectedMode);

            return (
              <div className="space-y-4">
                {/* Bố cục 2 cột giống ảnh mẫu: Cột trái (Nội dung đề & danh sách câu hỏi) + Cột phải (Sidebar Thời gian, Nộp bài, Danh sách số câu) */}
                <div className="flex flex-col lg:flex-row items-start gap-5">
                  {/* CỘT TRÁI: KHUNG BÀI LÀM CHÍNH */}
                  <div className="flex-1 w-full bg-white border-2 border-[#FFE0EC] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
                    {/* Hàng trên cùng: Công tắc Highlight nội dung + Lời chào của giám khảo Pippi */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-2.5">
                        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={highlightEnabled}
                            onClick={() => setHighlightEnabled((h) => !h)}
                            className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                              highlightEnabled ? 'bg-[#FF6FA5]' : 'bg-[#E2C6D3]'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                highlightEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-sm italic font-semibold text-[#5B2B3F]">
                            Highlight nội dung
                          </span>
                          <span
                            title="Bật để làm nổi bật các từ khóa quan trọng trong đề bài"
                            className="inline-flex items-center justify-center w-4 h-4 text-[11px] font-bold rounded-full border border-[#A56A82] text-[#A56A82]"
                          >
                            i
                          </span>
                        </label>

                        <div>
                          <span
                            className={`inline-block bg-[#FFE8F2] text-[#E04A86] text-sm font-bold px-4 py-2 rounded-2xl leading-relaxed ${
                              highlightEnabled ? 'selection:bg-[#FFB8D2]' : ''
                            }`}
                          >
                            {examinerGreeting}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Nội dung bài làm: Part 2 có thêm cột Cue card bên trái, Part 1 & 3 hiển thị thẳng danh sách câu hỏi */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
                      {state.part === 2 && (
                        <div className="md:col-span-5 bg-[#FFF7FA] border border-[#FFE0EC] rounded-xl p-5 space-y-4">
                          <div className="space-y-3">
                            {(() => {
                              const cueText = STEPS.find((s) => s[0] === 2)?.[2] || '';
                              const lines = cueText
                                .split('\n')
                                .map((l) => l.trim())
                                .filter(Boolean);
                              const topic = lines[0] || '';
                              const bullets = lines
                                .slice(1)
                                .filter((l) => l.startsWith('-'))
                                .map((l) => l.replace(/^-\s*/, ''));
                              return (
                                <div
                                  data-testid="part2-cue-card"
                                  className="bg-white border-2 border-[#FFB8D2] rounded-xl p-4 space-y-2"
                                >
                                  <span className="inline-block bg-[#E04A86] text-white text-xs font-bold px-3 py-0.5 rounded-full">
                                    🎀 Cue card
                                  </span>
                                  <div
                                    className={`text-base font-bold text-[#5B2B3F] ${
                                      highlightEnabled ? 'bg-[#FFF0F6] px-1.5 py-0.5 rounded' : ''
                                    }`}
                                  >
                                    {topic}
                                  </div>
                                  <div className="text-xs font-bold text-[#A56A82]">
                                    You should say:
                                  </div>
                                  <ul className="list-disc list-inside space-y-1 text-sm font-semibold text-[#5B2B3F]">
                                    {bullets.map((b, i) => (
                                      <li key={i}>{b}</li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            })()}

                            {/* Đồng hồ chuẩn bị 1 phút / nói 2 phút của Part 2 */}
                            {p2Phase === 'prep' ? (
                              <div className="bg-[#FFF8E7] border border-[#FFC46B] rounded-xl p-3 space-y-2">
                                <div className="text-xs font-bold text-[#8A5300] tabular-nums">
                                  ⏰ Chuẩn bị dàn ý:{' '}
                                  <span className="font-mono text-sm">
                                    {formatMMSS(Math.max(0, 60 - p2Elapsed))} / 01:00
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleSkipPrep}
                                  className="w-full py-1.5 px-3 text-xs font-bold text-[#5B2B3F] bg-white hover:bg-[#FFE0EC] border border-[#FFE0EC] rounded-lg transition-colors cursor-pointer"
                                >
                                  Bỏ qua thời gian chuẩn bị
                                </button>
                              </div>
                            ) : (
                              (() => {
                                const remain = 120 - p2Elapsed;
                                const isOver = remain < 0;
                                return (
                                  <div
                                    className={`rounded-xl p-3 text-xs font-bold flex items-center justify-between tabular-nums border ${
                                      isOver
                                        ? 'bg-[#FFE8EC] border-[#FF7A8A] text-[#E04A86]'
                                        : 'bg-[#E8FBF0] border-[#7ED6A7] text-[#216E43]'
                                    }`}
                                  >
                                    <span>
                                      {isOver ? '⏰ Đã hết 2 phút gợi ý' : '🎤 Thời gian nói gợi ý'}
                                    </span>
                                    <span className="font-mono text-sm">
                                      {isOver
                                        ? `+${formatMMSS(Math.abs(remain))}`
                                        : formatMMSS(remain)}
                                    </span>
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      )}

                      {/* Danh sách câu hỏi đánh số tròn + nút "Viết ghi chú / dàn ý" + vùng trả lời */}
                      <div
                        className={`${
                          state.part === 2 ? 'md:col-span-7' : 'md:col-span-12'
                        } space-y-6`}
                      >
                        {partQuestions.map((q) => {
                          const isFlagged = Boolean(flaggedQuestions[q.idx]);
                          const isNoteOpen = Boolean(openNotes[q.idx]);
                          const isTranscriptOpen = Boolean(openTranscripts[q.idx]);
                          const currentAns = answersByIdx[q.idx] ?? '';
                          const ansWords = countWords(currentAns);

                          return (
                            <div
                              key={q.idx}
                              id={`question-block-${q.num}`}
                              className="space-y-3 pb-5 border-b border-[#FFE0EC] last:border-b-0"
                            >
                              <div className="flex items-start gap-3">
                                {/* Số thứ tự câu hỏi hình tròn (click để đánh dấu review) */}
                                <button
                                  type="button"
                                  onClick={() => toggleFlagQuestion(q.idx)}
                                  title="Click vào số thứ tự câu hỏi để đánh dấu review"
                                  className={`w-8 h-8 rounded-full font-bold text-sm shrink-0 flex items-center justify-center transition-colors cursor-pointer border ${
                                    isFlagged
                                      ? 'bg-[#FFC46B] text-[#5B2B3F] border-[#E09B2D]'
                                      : 'bg-[#FFE8F2] text-[#E04A86] border-[#FFB8D2] hover:bg-[#FFD0E3]'
                                  }`}
                                >
                                  {q.num}
                                </button>

                                <div className="flex-1 space-y-2.5">
                                  {/* Hàng nút: Nghe câu hỏi + Hiện transcript + Viết ghi chú / dàn ý */}
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleSpeakQuestion(q.idx, q.question, q.cue)}
                                      title="Nghe giám khảo đọc câu hỏi"
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer border shrink-0 ${
                                        speakingQuestionIdx === q.idx
                                          ? 'bg-[#FF6FA5] text-white border-[#E04A86]'
                                          : 'bg-[#FFF0F6] text-[#E04A86] border-[#FFB8D2] hover:bg-[#FFE0EC]'
                                      }`}
                                    >
                                      {speakingQuestionIdx === q.idx ? (
                                        <>
                                          <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
                                          <span>Đang đọc... (Dừng)</span>
                                        </>
                                      ) : (
                                        <>
                                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                                          <span>Nghe câu hỏi</span>
                                        </>
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleTranscript(q.idx)}
                                      className={`px-3.5 py-1.5 text-xs font-bold border rounded-lg transition-colors cursor-pointer ${
                                        isTranscriptOpen
                                          ? 'bg-[#FFE0EC] text-[#5B2B3F] border-[#FF6FA5]'
                                          : 'text-[#E04A86] bg-white hover:bg-[#FFF0F6] border-[#FFB8D2]'
                                      }`}
                                    >
                                      {isTranscriptOpen ? 'Ẩn transcript' : 'Hiện transcript'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => toggleNoteBox(q.idx)}
                                      className="px-3.5 py-1.5 text-xs font-bold text-[#E04A86] bg-white hover:bg-[#FFF0F6] border border-[#FFB8D2] rounded-lg transition-colors cursor-pointer"
                                    >
                                      Viết ghi chú / dàn ý
                                    </button>
                                  </div>

                                  {/* Nội dung câu hỏi chỉ hiện khi nhấn vào nút "Hiện transcript" */}
                                  {isTranscriptOpen && (
                                    <div
                                      className={`p-3 rounded-xl bg-[#FFF5F9] border border-[#FFE0EC] text-base font-bold text-[#5B2B3F] leading-snug ${
                                        highlightEnabled ? 'selection:bg-[#FFB8D2]' : ''
                                      }`}
                                    >
                                      {q.question}
                                    </div>
                                  )}

                                  {/* Ô nhập ghi chú / dàn ý khi mở */}
                                  {isNoteOpen && (
                                    <textarea
                                      value={notesByIdx[q.idx] || ''}
                                      onChange={(e) =>
                                        setNotesByIdx((prev) => ({
                                          ...prev,
                                          [q.idx]: e.target.value,
                                        }))
                                      }
                                      placeholder={`Ghi chú nhanh từ vựng / dàn ý cho Câu ${q.num}...`}
                                      className="w-full h-20 p-2.5 text-sm font-medium bg-[#FFFDF9] border border-[#FFC46B] rounded-xl text-[#5B2B3F] focus:outline-none focus:border-[#E04A86]"
                                    />
                                  )}

                                  {/* Ô nhập câu trả lời dạng văn bản */}
                                  <div className="space-y-2 pt-1">
                                    <textarea
                                      aria-label={`Câu trả lời cho câu ${q.num}`}
                                      value={currentAns}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setAnswersByIdx((prev) => ({ ...prev, [q.idx]: val }));
                                        setAnswerBox(val);
                                        if (error) setError(null);
                                      }}
                                      style={{ height: q.part === 2 ? '190px' : '88px' }}
                                      placeholder={
                                        q.part === 2
                                          ? 'Trả lời một lượt dài (1–2 phút) theo các gợi ý trên Cue card tại đây...'
                                          : `Nhập câu trả lời tiếng Anh cho câu ${q.num}...`
                                      }
                                      className="w-full p-3 text-sm font-medium bg-white border-2 border-[#FFE0EC] rounded-xl text-[#5B2B3F] focus:outline-none focus:border-[#FF6FA5]"
                                    />

                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="text-xs font-semibold text-[#A56A82]">
                                        📝 Số từ:{' '}
                                        <strong className="text-[#5B2B3F]">{ansWords} từ</strong>
                                        {ansWords > 0 && ansWords < 3 && (
                                          <span className="text-[#E04A86] ml-1">
                                            (Hãy viết dài hơn 1 chút nhé)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {shortNotice && (
                          <div className="bg-[#FFF8E7] border border-[#FFC46B] rounded-xl px-3.5 py-2 text-xs font-bold text-[#8A5300]">
                            💡 {shortNotice}
                          </div>
                        )}

                        {error && (
                          <div
                            role="alert"
                            className="bg-[#FFE8EC] border border-[#FF7A8A] text-[#E04A86] rounded-xl px-3.5 py-2.5 text-xs font-bold"
                          >
                            {error}
                          </div>
                        )}

                        {/* Nút Tiếp tục để chuyển qua Part tiếp theo */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleContinueNextPart}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-[#FF6FA5] hover:bg-[#E04A86] rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                          >
                            <span>
                              {selectedMode === 'full' && state.part < 3
                                ? `Tiếp tục sang Part ${state.part + 1} ▸`
                                : 'Hoàn thành & Nộp bài ▸'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI: SIDEBAR THỜI GIAN LÀM BÀI, NÚT NỘP BÀI & BẢNG SỐ THỨ TỰ CÂU HỎI */}
                  <aside className="w-full lg:w-[250px] shrink-0 bg-white border-2 border-[#FFE0EC] rounded-2xl p-5 shadow-xs space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-[#5B2B3F]">
                        Thời gian làm bài:
                      </div>
                      <div className="text-2xl font-bold text-[#5B2B3F] tabular-nums tracking-tight">
                        {formatMMSS(totalElapsedSeconds)}
                      </div>
                      <div className="text-xs font-semibold text-[#A56A82] tabular-nums mt-0.5">
                        Part {state.part}: {formatMMSS(partSeconds[state.part])}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleFinishExamNow}
                      className="w-full py-2.5 px-4 text-sm font-bold text-[#E04A86] bg-white hover:bg-[#FF6FA5] hover:text-white border-2 border-[#FF6FA5] rounded-xl transition-colors cursor-pointer"
                    >
                      NỘP BÀI
                    </button>

                    <div>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="text-xs font-bold italic text-[#E04A86] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Khôi phục/lưu bài làm</span>
                        <span>▸</span>
                      </button>
                      {saveDraftNotice && (
                        <div className="text-[11px] font-bold text-[#287D4E] mt-1">
                          ✓ {saveDraftNotice}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-1 border-t border-[#FFE0EC]">
                      {sidebarGroups.map((group) => (
                        <div key={group.label} className="space-y-1.5">
                          <div className="text-xs font-bold text-[#5B2B3F]">{group.label}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.indices.map((qIdx) => {
                              const qNum = qIdx + 1;
                              const hasAns = Boolean((answersByIdx[qIdx] || '').trim());
                              const isFlagged = Boolean(flaggedQuestions[qIdx]);
                              const isCurrentPart = state.part === group.partNum;

                              return (
                                <button
                                  key={qIdx}
                                  type="button"
                                  onClick={() => {
                                    if (selectedMode === 'full') {
                                      handleSwitchPartInFullTest(group.partNum);
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-md text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center ${
                                    isFlagged
                                      ? 'bg-[#FFC46B] border-[#E09B2D] text-[#5B2B3F]'
                                      : hasAns
                                      ? 'bg-[#FF6FA5] border-[#E04A86] text-white'
                                      : isCurrentPart
                                      ? 'bg-[#FFF0F6] border-[#E04A86] text-[#E04A86]'
                                      : 'bg-white border-[#D6B8C6] text-[#5B2B3F] hover:border-[#FF6FA5]'
                                  }`}
                                >
                                  {qNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              </div>
            );
          })()
        )}
      </main>
    </div>
  );
}
