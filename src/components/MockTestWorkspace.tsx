import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Sparkles,
  FileDown,
  Terminal,
  BookOpen,
  FileText,
  ArrowRight,
  Heart,
} from 'lucide-react';
import {
  TopicTrack,
  RenderedQuestion,
  SessionProgress,
  SavedAnswerRow,
  TraceEvent,
  SessionRecord,
  PART_GUIDANCE,
  parseCueCard,
  countWords,
  validateAnswerInput,
  buildPreliminaryFeedback,
} from '../engine/speakingEngine';
import { SAMPLE_ANSWERS_BY_QUESTION_ID } from '../data/tv1Deliverables';

interface MockTestWorkspaceProps {
  activeSessionId: string;
  progressState: SessionProgress;
  currentQ: RenderedQuestion | null;
  transcriptRows: SavedAnswerRow[];
  traceEvents: TraceEvent[];
  allSessions: SessionRecord[];
  onStartNewSession: (learnerId: string, track: TopicTrack, liveMode: boolean) => void;
  onLoadSession: (sessionId: string) => { ok: boolean; error?: string };
  onSubmitAnswer: (
    questionId: string,
    answer: string,
    liveMode: boolean
  ) => { ok: boolean; error?: string; toolsCalled?: string[] };
  onOpenTranscriptTab: () => void;
}

export const MockTestWorkspace: React.FC<MockTestWorkspaceProps> = ({
  activeSessionId,
  progressState,
  currentQ,
  transcriptRows,
  traceEvents,
  allSessions,
  onStartNewSession,
  onLoadSession,
  onSubmitAnswer,
  onOpenTranscriptTab,
}) => {
  const [learnerInput, setLearnerInput] = useState(progressState.learner_id || 'minh_anh_uit');
  const [trackInput, setTrackInput] = useState<TopicTrack>(progressState.track || 'study');
  const [liveMode, setLiveMode] = useState(false);
  const [resumeInput, setResumeInput] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [prepNotes, setPrepNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedSid, setCopiedSid] = useState(false);

  const activePart: 1 | 2 | 3 = currentQ ? currentQ.part : 3;
  const partInfo = PART_GUIDANCE[activePart];
  const currentWordCount = countWords(answerText);

  const handleCopySessionId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeSessionId);
    }
    setCopiedSid(true);
    setTimeout(() => setCopiedSid(false), 1800);
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    setFormError(null);
    const cleaned = learnerInput.trim();
    if (!cleaned) {
      setSessionError('Bạn ơi, vui lòng nhập biệt danh học viên (1–80 ký tự) trước khi bắt đầu nhé!');
      return;
    }
    if (cleaned.length > 80) {
      setSessionError('Biệt danh học viên tối đa 80 ký tự thôi nhé.');
      return;
    }
    onStartNewSession(cleaned, trackInput, liveMode);
    setAnswerText('');
    setPrepNotes('');
    setToastMessage(`🌸 Đã tạo phòng thi mới chủ đề ${trackInput === 'study' ? 'Study (Học tập)' : 'Technology (Công nghệ)'}!`);
  };

  const handleResumeSession = (e: React.FormEvent) => {
    e.preventDefault();
    setSessionError(null);
    setFormError(null);
    const cleaned = resumeInput.trim();
    if (!cleaned) {
      setSessionError('Vui lòng dán mã Session ID để mở lại bài làm cũ nhé.');
      return;
    }
    const res = onLoadSession(cleaned);
    if (!res.ok) {
      setSessionError(res.error || 'Không tìm thấy Session ID này.');
    } else {
      setAnswerText('');
      setToastMessage(`✨ Đã khôi phục phiên làm bài ${cleaned.slice(0, 8)}...`);
    }
  };

  const handleQuickSwitchSession = (sid: string) => {
    setSessionError(null);
    setFormError(null);
    const res = onLoadSession(sid);
    if (res.ok) {
      setAnswerText('');
      setToastMessage(`🌷 Đã chuyển sang phòng thi ${sid.slice(0, 8)}...`);
    }
  };

  const handleFillSampleAnswer = () => {
    if (!currentQ) return;
    const sample =
      SAMPLE_ANSWERS_BY_QUESTION_ID[currentQ.question_id] ||
      'I believe regular practice with friends and online resources is essential for mastering English skills effectively.';
    setAnswerText(sample);
    setFormError(null);
  };

  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const check = validateAnswerInput(answerText, currentQ);
    if (!check.valid) {
      setFormError('Bạn chưa nhập câu trả lời kìa! Hãy gõ câu trả lời tiếng Anh trước khi gửi nhé 💌');
      return;
    }
    if (!currentQ) return;

    const result = onSubmitAnswer(currentQ.question_id, answerText, liveMode);
    if (!result.ok) {
      setFormError(result.error || 'Agent chưa lưu được câu trả lời. Bạn thử lại nhé!');
    } else {
      setAnswerText('');
      setToastMessage(
        `🍓 Đã lưu câu trả lời (${check.wordCount} từ) qua Agent loop: ${(result.toolsCalled || []).join(' → ')}`
      );
    }
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([JSON.stringify(transcriptRows, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSessionId}_transcript.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const preliminaryFeedback = progressState.done
    ? buildPreliminaryFeedback(transcriptRows)
    : null;

  const isTargetWordCountMet = currentQ
    ? currentWordCount >= partInfo.minRecommendedWords
    : false;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Cozy Welcome & Mandatory Disclaimer Banner (Section 1.5.2) */}
      <div className="mb-6 px-5 py-3.5 bg-white border border-pink-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="text-xs text-[#6B3B5E] leading-relaxed">
          <strong className="text-[#4A1D3E] font-bold">🌸 Lưu ý nhỏ (Quy định 1.5.2):</strong>{' '}
          Phòng luyện Speaking dạng văn bản (Text-Only) giúp bạn rèn ý tưởng &amp; từ vựng. Hệ thống không chấm phát âm (
          <code className="text-pink-700 font-mono">Pronunciation: not_assessed</code>) và chỉ đưa nhận xét luyện tập, không thay thế điểm IELTS chính thức.
        </div>
        <div className="text-xs text-[#8E5B80] font-medium whitespace-nowrap shrink-0">
          Part 1 · Part 2 Cue Card · Part 3 Discussion
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT SIDEBAR: Cute Study Corner Settings */}
        <aside className="lg:col-span-4 bg-white border border-pink-200 rounded-2xl p-6 space-y-6 shadow-2xs">
          <div>
            <h2 className="text-lg font-bold text-[#4A1D3E] font-display">
              🧸 Góc Cài Đặt Phòng Thi
            </h2>
            <p className="text-xs text-[#8E5B80] mt-0.5">
              Chọn chủ đề yêu thích hoặc mở lại bài làm đã lưu của bạn
            </p>
          </div>

          <form onSubmit={handleStartSession} className="space-y-4">
            <label className="flex items-start gap-2.5 p-3 bg-pink-50/60 border border-pink-200/80 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={liveMode}
                onChange={(e) => setLiveMode(e.target.checked)}
                className="mt-0.5 rounded border-pink-300 text-pink-500 focus:ring-pink-400"
              />
              <span className="text-xs text-[#6B3B5E] leading-snug">
                <span className="font-bold text-[#4A1D3E] block">Bật Live LLM Agent</span>
                Chế độ mặc định dùng <code className="font-mono text-pink-700">ScriptedToolModel</code> chạy mượt không cần API key.
              </span>
            </label>

            <div>
              <label htmlFor="learner-id-input" className="block text-xs font-bold text-[#4A1D3E] mb-1.5">
                Biệt danh của bạn (Learner ID)
              </label>
              <input
                id="learner-id-input"
                type="text"
                value={learnerInput}
                onChange={(e) => setLearnerInput(e.target.value)}
                maxLength={80}
                placeholder="Ví dụ: minh_anh_cute"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-pink-200 rounded-xl text-[#4A1D3E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div>
              <label htmlFor="topic-track-select" className="block text-xs font-bold text-[#4A1D3E] mb-1.5">
                Chủ đề luyện nói (Topic Track)
              </label>
              <select
                id="topic-track-select"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value as TopicTrack)}
                className="w-full px-3.5 py-2.5 text-sm bg-[#FFF9FB] border border-pink-200 rounded-xl text-[#4A1D3E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="study">📚 Study — Học tập &amp; Kỹ năng mới (8 câu)</option>
                <option value="technology">💻 Technology — Công nghệ &amp; Đời sống (8 câu)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              🌸 Bắt đầu bài thi mới
            </button>
          </form>

          <hr className="border-pink-100" />

          {/* Resume by Session ID */}
          <form onSubmit={handleResumeSession} className="space-y-3">
            <label htmlFor="resume-sid-input" className="block text-xs font-bold text-[#4A1D3E]">
              Mở lại phiên đã lưu (Resume Session ID)
            </label>
            <input
              id="resume-sid-input"
              type="text"
              value={resumeInput}
              onChange={(e) => setResumeInput(e.target.value)}
              placeholder="Dán mã Session ID 32 ký tự vào đây..."
              className="w-full px-3.5 py-2 text-xs font-mono bg-[#FFF9FB] border border-pink-200 rounded-xl text-[#4A1D3E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit"
              className="w-full py-2 px-4 text-xs font-bold text-[#6B3B5E] bg-pink-100/80 hover:bg-pink-200/70 rounded-xl transition-colors whitespace-nowrap cursor-pointer"
            >
              Mở lại bài làm đã lưu
            </button>
          </form>

          {sessionError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" aria-hidden="true" />
              <span>{sessionError}</span>
            </div>
          )}

          {/* Quick-Switch Demo Sessions for fast testing of Part 1, Part 2 Cue Card, Part 3 */}
          <div className="pt-2 border-t border-pink-100 space-y-2.5">
            <div className="text-xs font-bold text-[#4A1D3E]">
              🎀 Chọn nhanh từng phần để xem thử giao diện:
            </div>
            <div className="space-y-2">
              {allSessions.map((sess) => {
                const isCurrent = sess.id === activeSessionId;
                const nextIdx = sess.answers.length;
                const stageLabel =
                  nextIdx >= 8
                    ? '🎉 Đã hoàn thành (8/8)'
                    : nextIdx === 3
                    ? '🍰 Đang ở Part 2 Cue Card (Q4/8)'
                    : nextIdx < 3
                    ? `🌸 Đang ở Part 1 (Q${nextIdx + 1}/8)`
                    : nextIdx === 4
                    ? '🍰 Part 2 Follow-up (Q5/8)'
                    : `✨ Đang ở Part 3 (Q${nextIdx + 1}/8)`;
                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => handleQuickSwitchSession(sess.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-pink-50 border-pink-300 text-[#4A1D3E]'
                        : 'bg-[#FFF9FB] border-pink-100 text-[#6B3B5E] hover:bg-pink-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[#4A1D3E]">
                      <span className="capitalize">Chủ đề {sess.track}</span>
                      <span className="text-[11px] text-pink-600">{stageLabel}</span>
                    </div>
                    <div className="font-mono text-[11px] text-[#8E5B80] truncate mt-0.5">
                      ID: {sess.id}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT STAGE: Cute Speaking Mock Test Area */}
        <section className="lg:col-span-8 space-y-6">
          {/* Session Header & Progress Bar */}
          <div className="bg-white border border-pink-200 rounded-2xl p-6 space-y-5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#8E5B80]">
                  Mã phiên làm bài hiện tại (lưu lại để mở tiếp bất cứ lúc nào nha)
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="px-3 py-1 bg-pink-50 text-[#4A1D3E] border border-pink-200 rounded-lg text-xs font-mono select-all">
                    {activeSessionId}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySessionId}
                    aria-label="Copy active Session ID"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-pink-700 hover:text-pink-900 bg-pink-50/70 hover:bg-pink-100 border border-pink-200 rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedSid ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#6B3B5E] tabular-nums">
                <span>
                  Học viên: <strong className="text-[#4A1D3E]">{progressState.learner_id}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Chủ đề: <strong className="text-[#4A1D3E] capitalize">{progressState.track}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Tiến độ:{' '}
                  <strong className="text-pink-600 font-mono">
                    {progressState.completed}/{progressState.total}
                  </strong>
                </span>
              </div>
            </div>

            {/* Cute Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#4A1D3E] mb-1.5 tabular-nums">
                <span>🌱 Hành trình hoàn thành bài Speaking</span>
                <span className="font-mono text-pink-600">
                  {Math.round((progressState.completed / progressState.total) * 100)}% (
                  {progressState.completed}/{progressState.total} câu)
                </span>
              </div>
              <div className="w-full h-3 bg-pink-100/80 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-rose-500 rounded-full transition-all duration-200"
                  style={{
                    width: `${(progressState.completed / progressState.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* 3-Part Cute Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[
                { part: 1 as const, label: '🌸 Part 1 · Làm quen', range: 'Câu 1–3' },
                { part: 2 as const, label: '🍰 Part 2 · Cue Card', range: 'Câu 4–5' },
                { part: 3 as const, label: '✨ Part 3 · Thảo luận', range: 'Câu 6–8' },
              ].map((step) => {
                const isDone = progressState.done || step.part < activePart;
                const isCurrent = !progressState.done && step.part === activePart;
                return (
                  <div
                    key={step.part}
                    className={`px-3.5 py-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isDone
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold'
                        : isCurrent
                        ? 'bg-pink-50 border-pink-300 text-[#4A1D3E] font-bold shadow-2xs'
                        : 'bg-[#FFF9FB] border-pink-100 text-[#8E5B80]'
                    }`}
                  >
                    <span className="truncate">
                      {isDone ? '✓ ' : ''}
                      {step.label}
                    </span>
                    <span className="font-mono text-[11px] ml-2 shrink-0">{step.range}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {toastMessage && (
            <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
                <span className="font-medium">{toastMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold ml-4 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}

          {/* ACTIVE QUESTION CARD OR COMPLETED SUMMARY */}
          {currentQ ? (
            <div className="bg-white border border-pink-200 rounded-2xl p-6 space-y-6 shadow-2xs">
              {/* Part Header & Guidance */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-pink-100">
                <div>
                  <div className="text-xs font-bold text-pink-600">
                    {partInfo.formatNote} · Mã câu:{' '}
                    <code className="font-mono">{currentQ.question_id}</code>
                  </div>
                  <h3 className="text-xl font-bold text-[#4A1D3E] mt-1 font-display">
                    {partInfo.title} — Câu {currentQ.number}/{currentQ.total}
                  </h3>
                  <p className="text-xs text-[#7A496B] mt-1">{partInfo.subtitle}</p>
                </div>
                <div className="text-right text-xs bg-pink-50/70 border border-pink-200/80 px-3.5 py-2 rounded-xl">
                  <div className="text-[#8E5B80]">Độ dài khuyến nghị</div>
                  <div className="font-bold text-[#4A1D3E] mt-0.5">{partInfo.targetWords}</div>
                </div>
              </div>

              {/* Cute Examiner Strategy Tips */}
              <div className="p-4 bg-[#FFF9FB] border border-pink-200/80 rounded-xl space-y-1.5">
                <div className="text-xs font-bold text-[#4A1D3E] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-pink-500" aria-hidden="true" />
                  <span>💡 Mẹo nhỏ từ Cô Thỏ Examiner cho Part {currentQ.part}:</span>
                </div>
                <ul className="text-xs text-[#6B3B5E] space-y-1 list-disc list-inside">
                  {partInfo.tips.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Distinct Cute UI for Part 2 Cue Card vs Part 1/3 Question */}
              {currentQ.kind === 'cue' ? (
                <div className="space-y-4">
                  {(() => {
                    const cue = parseCueCard(currentQ.text);
                    return (
                      <div
                        data-testid="part2-cue-card"
                        className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                          <span>🍰 Thẻ Chủ Đề Part 2 — Candidate Cue Card</span>
                          <span className="font-mono">Bài nói dài · 110–180 từ</span>
                        </div>
                        <div className="text-lg font-bold text-[#4A1D3E] font-display">
                          {cue.topicHeadline}
                        </div>
                        {cue.bullets.length > 0 && (
                          <div className="space-y-1.5 bg-white/80 p-3.5 rounded-xl border border-amber-200/70">
                            <div className="text-xs font-bold text-amber-900">
                              {cue.promptHeader}
                            </div>
                            <ul className="space-y-1 text-sm text-[#4A1D3E] list-disc list-inside pl-1">
                              {cue.bullets.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {cue.closingExplain && (
                          <div className="text-sm font-semibold text-[#4A1D3E] pt-1">
                            ✨ {cue.closingExplain}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div>
                    <label
                      htmlFor="part2-prep-notes"
                      className="block text-xs font-bold text-[#4A1D3E] mb-1.5"
                    >
                      📝 Sổ tay nháp ý tưởng Part 2 (Doodle Pad — không tính điểm)
                    </label>
                    <textarea
                      id="part2-prep-notes"
                      rows={2}
                      value={prepNotes}
                      onChange={(e) => setPrepNotes(e.target.value)}
                      placeholder="Gạch đầu dòng nhanh từ khóa, kỷ niệm hoặc cấu trúc câu bạn muốn dùng ở Part 2..."
                      className="w-full px-3.5 py-2.5 text-xs bg-[#FFF9FB] border border-pink-200 rounded-xl text-[#4A1D3E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-5 bg-pink-50/50 border border-pink-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-pink-700 font-semibold">
                    <span>
                      {currentQ.kind === 'followup'
                        ? '🐰 Câu hỏi đào sâu (Examiner hỏi tiếp từ câu trả lời trước của bạn)'
                        : `🐰 Cô Thỏ Examiner hỏi · Part ${currentQ.part}`}
                    </span>
                    <span className="font-mono">{currentQ.question_id}</span>
                  </div>
                  <p className="text-base font-bold text-[#4A1D3E] leading-relaxed">
                    “{currentQ.text}”
                  </p>
                </div>
              )}

              {/* Answer Input Form */}
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <label htmlFor="candidate-answer-textarea" className="text-xs font-bold text-[#4A1D3E]">
                      ✍️ Câu trả lời tiếng Anh của bạn
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleFillSampleAnswer}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Điền câu trả lời mẫu gợi ý</span>
                      </button>
                      <span
                        className={`text-xs font-mono tabular-nums ${
                          isTargetWordCountMet ? 'text-emerald-700 font-semibold' : 'text-[#8E5B80]'
                        }`}
                      >
                        {currentWordCount} từ · {answerText.length}/5000 ký tự
                      </span>
                    </div>
                  </div>
                  <textarea
                    id="candidate-answer-textarea"
                    rows={currentQ.kind === 'cue' ? 6 : 4}
                    maxLength={5000}
                    value={answerText}
                    onChange={(e) => {
                      setAnswerText(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    placeholder="Gõ câu trả lời tiếng Anh của bạn vào đây nhé..."
                    className="w-full px-4 py-3 text-sm bg-[#FFF9FB] border border-pink-200 rounded-2xl text-[#4A1D3E] leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                  <div className="text-xs text-[#7A496B]">
                    {currentWordCount === 0 ? (
                      <>
                        Mục tiêu tối thiểu cho Part {currentQ.part}:{' '}
                        <strong className="text-[#4A1D3E]">{partInfo.minRecommendedWords}+ từ</strong>.
                      </>
                    ) : isTargetWordCountMet ? (
                      <span className="text-emerald-700 font-semibold">
                        🌸 Tuyệt vời! Độ dài câu trả lời ({currentWordCount} từ) đã đạt mức khuyến nghị.
                      </span>
                    ) : (
                      <span>
                        🌱 Hãy viết thêm một chút ví dụ nhé (đang có {currentWordCount}/
                        {partInfo.minRecommendedWords} từ khuyến nghị).
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Gửi câu trả lời &amp; Tiếp tục</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* COMPLETED SUMMARY STATE */
            <div className="bg-white border border-pink-200 rounded-2xl p-6 space-y-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-pink-100">
                <div>
                  <div className="text-xs font-bold text-emerald-700">
                    🎉 Chúc mừng bạn đã hoàn thành trọn vẹn 8/8 câu hỏi (Part 1 → Part 2 → Part 3)!
                  </div>
                  <h3 className="text-xl font-bold text-[#4A1D3E] mt-1 font-display">
                    🍓 Tổng Kết &amp; Nhận Xét Luyện Tập Sơ Bộ
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTranscript}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                  <span>Tải Transcript JSON</span>
                </button>
              </div>

              {preliminaryFeedback && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 tabular-nums">
                    <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl">
                      <div className="text-xs text-[#7A496B]">Số câu hoàn thành</div>
                      <div className="text-2xl font-bold text-[#4A1D3E] font-mono mt-1">
                        {preliminaryFeedback.totalAnswers}/8
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl">
                      <div className="text-xs text-[#7A496B]">Tổng số từ đã viết</div>
                      <div className="text-2xl font-bold text-[#4A1D3E] font-mono mt-1">
                        {preliminaryFeedback.totalWords}
                      </div>
                    </div>
                    <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl">
                      <div className="text-xs text-[#7A496B]">Trung bình từ / lượt</div>
                      <div className="text-2xl font-bold text-[#4A1D3E] font-mono mt-1">
                        {preliminaryFeedback.avgWordsPerTurn}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#4A1D3E]">
                      🌷 Đánh giá độ phát triển ý theo từng Part
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {preliminaryFeedback.partBreakdown.map((pb) => (
                        <div
                          key={pb.part}
                          className="p-4 bg-[#FFF9FB] border border-pink-200 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-[#4A1D3E]">
                            <span>Part {pb.part}</span>
                            <span className="font-mono text-pink-600">{pb.avgWords} words/turn</span>
                          </div>
                          <div className="text-xs font-semibold text-[#6B3B5E]">{pb.statusLabel}</div>
                          <p className="text-xs text-[#7A496B] leading-relaxed">{pb.observation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                        <span>Điểm làm tốt</span>
                      </div>
                      <ul className="text-xs text-emerald-900 space-y-1 list-disc list-inside">
                        {preliminaryFeedback.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                      <div className="text-xs font-bold text-amber-950">
                        🌱 Gợi ý cải thiện tiếp theo
                      </div>
                      <ul className="text-xs text-amber-900 space-y-1 list-disc list-inside">
                        {preliminaryFeedback.nextSteps.map((n, idx) => (
                          <li key={idx}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-pink-50/40 border border-pink-200 rounded-xl text-xs text-[#6B3B5E] space-y-1">
                    <div className="font-bold text-[#4A1D3E]">
                      Nhãn bắt buộc (Quy định 1.5.2):
                    </div>
                    <p>{preliminaryFeedback.disclaimer}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* LIVE TRANSCRIPT PREVIEW */}
          <div>
            {/* Transcript Preview */}
            <div className="bg-white border border-pink-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#4A1D3E] flex items-center gap-2 font-display">
                  <FileText className="w-4 h-4 text-pink-500" aria-hidden="true" />
                  <span>📃 Nhật ký câu trả lời ({transcriptRows.length} câu)</span>
                </h3>
                <button
                  type="button"
                  onClick={handleDownloadTranscript}
                  disabled={transcriptRows.length === 0}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 disabled:opacity-40 cursor-pointer"
                >
                  Tải JSON
                </button>
              </div>

              {transcriptRows.length === 0 ? (
                <p className="text-xs text-[#8E5B80] py-4">
                  Chưa có câu trả lời nào được lưu. Hãy gửi câu trả lời đầu tiên của bạn nhé!
                </p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {transcriptRows.map((item, idx) => (
                    <div
                      key={item.question_id}
                      className="p-3.5 bg-[#FFF9FB] border border-pink-100 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[#8E5B80] font-mono">
                        <span>
                          Câu {idx + 1} · Part {item.part} ({item.question_id})
                        </span>
                        <span>{item.word_count} words</span>
                      </div>
                      <div className="text-[#4A1D3E]">
                        <strong>🐰 Examiner:</strong> {item.question_text}
                      </div>
                      <div className="text-[#6B3B5E]">
                        <strong className="text-pink-700">🍓 Bạn:</strong> {item.answer_text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
