import React from 'react';
import { FileDown, Terminal, FileText, ArrowLeft } from 'lucide-react';
import {
  SessionProgress,
  SavedAnswerRow,
  TraceEvent,
  buildPreliminaryFeedback,
} from '../engine/speakingEngine';

interface TranscriptTraceViewProps {
  activeSessionId: string;
  progressState: SessionProgress;
  transcriptRows: SavedAnswerRow[];
  traceEvents: TraceEvent[];
  onBackToTest: () => void;
}

export const TranscriptTraceView: React.FC<TranscriptTraceViewProps> = ({
  activeSessionId,
  progressState,
  transcriptRows,
  traceEvents,
  onBackToTest,
}) => {
  const feedback = buildPreliminaryFeedback(transcriptRows);

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

  const handleDownloadTraceJsonl = () => {
    const jsonl = traceEvents.map((e) => JSON.stringify(e)).join('\n') + '\n';
    const blob = new Blob([jsonl], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSessionId}_agent_trace.jsonl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="bg-white border border-pink-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="text-xs font-mono text-pink-600">
            Session ID: {activeSessionId} · Học viên: {progressState.learner_id} · Chủ đề:{' '}
            {progressState.track.toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold text-[#4A1D3E] mt-1 font-display">
            🍓 Nhật Ký Bài Nói (Transcript) &amp; Bước Chạy Agent (JSONL Trace)
          </h1>
          <p className="text-xs text-[#7A496B] mt-1">
            Xem lại toàn bộ câu trả lời của bạn và lịch sử gọi công cụ (Tools) của Examiner Agent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#6B3B5E] bg-pink-100/80 hover:bg-pink-200/70 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Quay lại phòng thi</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadTranscript}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tải Transcript JSON</span>
          </button>
        </div>
      </div>

      {/* Preliminary Practice Metrics */}
      <div className="bg-white border border-pink-200 rounded-2xl p-6 space-y-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#4A1D3E] font-display">
            🌸 Thống kê luyện tập sơ bộ theo 3 Part
          </h2>
          <span className="text-xs font-mono text-[#8E5B80]">
            Pronunciation: not_assessed · Text-only prototype
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
          {feedback.partBreakdown.map((pb) => (
            <div key={pb.part} className="p-4 bg-[#FFF9FB] border border-pink-200 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#4A1D3E]">
                <span>{pb.label}</span>
                <span className="font-mono text-pink-600">{pb.turnsAnswered} câu</span>
              </div>
              <div className="text-sm font-bold text-[#4A1D3E] font-mono">
                TB {pb.avgWords} từ / câu · {pb.statusLabel}
              </div>
              <p className="text-xs text-[#7A496B]">{pb.observation}</p>
            </div>
          ))}
        </div>

        <div className="text-xs text-[#8E5B80] pt-1">{feedback.disclaimer}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Full Transcript */}
        <div className="lg:col-span-6 bg-white border border-pink-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#4A1D3E] flex items-center gap-2 font-display">
              <FileText className="w-4 h-4 text-pink-500" aria-hidden="true" />
              <span>📃 Toàn bộ hội thoại ({transcriptRows.length} lượt)</span>
            </h2>
          </div>

          {transcriptRows.length === 0 ? (
            <p className="text-xs text-[#8E5B80] py-6">Chưa có câu trả lời nào trong phiên này.</p>
          ) : (
            <div className="space-y-3">
              {transcriptRows.map((row, idx) => (
                <div
                  key={row.question_id}
                  className="p-4 bg-[#FFF9FB] border border-pink-100 rounded-xl text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[#8E5B80] font-mono">
                    <span>
                      Câu {idx + 1} · Part {row.part} · {row.kind.toUpperCase()} ({row.question_id})
                    </span>
                    <span>{row.word_count} từ</span>
                  </div>
                  <div className="text-[#4A1D3E] font-bold whitespace-pre-line">
                    🐰 Examiner: {row.question_text}
                  </div>
                  <div className="text-[#6B3B5E] leading-relaxed">
                    <strong className="text-pink-700">🍓 Bạn:</strong> {row.answer_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full JSONL Trace */}
        <div className="lg:col-span-6 bg-white border border-pink-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#4A1D3E] flex items-center gap-2 font-display">
              <Terminal className="w-4 h-4 text-pink-500" aria-hidden="true" />
              <span>🛠 Agent Tool Trace (logs/agent_trace.jsonl)</span>
            </h2>
            <button
              type="button"
              onClick={handleDownloadTraceJsonl}
              className="text-xs font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
            >
              Tải file .jsonl
            </button>
          </div>

          <p className="text-xs text-[#7A496B]">
            Bảo mật dữ liệu học viên (Mục 4.4): Log JSONL chỉ lưu tên tool và trạng thái thực thi, không lưu nội dung câu trả lời thô.
          </p>

          <pre className="p-4 bg-[#2E1529] text-pink-100 rounded-xl text-xs font-mono leading-relaxed overflow-x-auto max-h-[540px]">
            <code>{JSON.stringify(traceEvents, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
