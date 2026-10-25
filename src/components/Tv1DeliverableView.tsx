import React, { useState } from 'react';
import { Copy, Check, Download, GitBranch, GitCommit, CheckSquare, Square } from 'lucide-react';
import { TV1_COMMITS, TV1_GIT_WORKFLOW } from '../data/tv1Deliverables';

interface Tv1DeliverableViewProps {
  mode: 'code' | 'git';
  onDownloadAppPy: () => void;
}

export const Tv1DeliverableView: React.FC<Tv1DeliverableViewProps> = ({
  mode,
  onDownloadAppPy,
}) => {
  const [selectedCommitId, setSelectedCommitId] = useState<string>('commit-3');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    c1: true,
    c2: true,
    c3: true,
    c4: true,
    c5: true,
    c6: true,
  });

  const activeCommit =
    TV1_COMMITS.find((c) => c.id === selectedCommitId) || TV1_COMMITS[TV1_COMMITS.length - 1];

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activeCommit.code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const gitCommandsBlock = `# Bước 1: Đồng bộ nhánh main và tạo branch riêng cho TV1
git checkout main
git pull origin main
git checkout -b feature/streamlit-ui

# Bước 2: Thực hiện Commit 1 (Cải thiện giao diện chung & thanh tiến trình 3 Part)
git add app.py
git commit -m "feat(ui): improve speaking test interface and 3-part progress stepper"

# Bước 3: Thực hiện Commit 2 (Thêm hướng dẫn từng Part & giao diện Cue Card Part 2)
git add app.py
git commit -m "feat(ui): add part-specific guidance and distinct Part 2 cue card layout"

# Bước 4: Thực hiện Commit 3 (Kiểm tra lỗi nhập liệu, lỗi session & bảng nhận xét sơ bộ)
git add app.py
git commit -m "fix(ui): handle form validation, session errors, and preliminary practice summary"

# Bước 5: Chạy kiểm thử pytest để chắc chắn không làm gãy 18 test của nhóm
pytest -v

# Bước 6: Push branch lên GitHub và tạo Pull Request
git push -u origin feature/streamlit-ui`;

  const handleCopyGit = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gitCommandsBlock);
    }
    setCopiedGit(true);
    setTimeout(() => setCopiedGit(false), 1800);
  };

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-sky-700">
            TV1 Deliverable · File: app.py · Branch: {TV1_GIT_WORKFLOW.branchName}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 font-display">
            {mode === 'code'
              ? 'TV1 Source Code Deliverable (app.py & 3 Git Commits)'
              : 'TV1 Git Workflow, Pull Request & Interface Contract'}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Tương thích 100% với hàm giao tiếp của TV2 (<code className="font-mono">run_agent</code>), TV3 (
            <code className="font-mono">start_session, current_question, progress, transcript, load_tracks</code>) và TV4 (
            <code className="font-mono">recent_logs</code>).
          </p>
        </div>

        <button
          type="button"
          onClick={onDownloadAppPy}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          <span>Download Final app.py</span>
        </button>
      </div>

      {mode === 'code' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left selector: 3 Commits */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-sky-600" aria-hidden="true" />
                <span>3 Staged Commits for TV1</span>
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chọn từng commit để xem nội dung thay đổi và copy đúng code cho lịch sử Git rõ ràng trên GitHub:
              </p>
              <div className="space-y-2">
                {TV1_COMMITS.map((commit) => {
                  const isSelected = commit.id === selectedCommitId;
                  return (
                    <button
                      key={commit.id}
                      type="button"
                      onClick={() => setSelectedCommitId(commit.id)}
                      className={`w-full text-left p-3.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50 border-sky-300 text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{commit.summaryTitle}</div>
                      <div className="font-mono text-[11px] text-sky-700 mt-1 truncate">
                        {commit.commitMessage}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-900">
                Điểm nâng cấp chính trong {activeCommit.summaryTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">{activeCommit.description}</p>
              <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside">
                {activeCommit.changedHighlights.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right code viewer */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-sky-400">{activeCommit.commitMessage}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  File: <code className="font-mono text-white">ielts_speaking_phase1/app.py</code>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Copied app.py</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto max-h-[640px]">
              <code>{activeCommit.code}</code>
            </pre>
          </div>
        </div>
      ) : (
        /* GIT WORKFLOW & INTERFACE CONTRACT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-900 text-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <GitBranch className="w-4 h-4 text-sky-400" aria-hidden="true" />
                  <span>Git Commands cho TV1 (branch: feature/streamlit-ui)</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyGit}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded cursor-pointer"
                >
                  {copiedGit ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy Commands</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-5 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed overflow-x-auto">
                <code>{gitCommandsBlock}</code>
              </pre>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Mẫu nội dung Pull Request (PR) cho TV1
              </h2>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-700">PR Title:</span>{' '}
                  <code className="px-2 py-0.5 bg-slate-100 rounded font-mono text-slate-900">
                    {TV1_GIT_WORKFLOW.prTitle}
                  </code>
                </div>
                <pre className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {TV1_GIT_WORKFLOW.prBody}
                </pre>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Checklist nghiệm thu TV1 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Checklist bàn giao của TV1 (Frontend / App)
              </h2>
              <div className="space-y-2.5">
                {[
                  {
                    key: 'c1',
                    label: 'Hiển thị rõ Part 1, Part 2 (Cue Card), Part 3 và thanh chuyển trạng thái giữa 3 phần',
                  },
                  {
                    key: 'c2',
                    label: 'Cho phép nhập câu trả lời tiếng Anh, đếm số từ và gửi đến run_agent()',
                  },
                  {
                    key: 'c3',
                    label: 'Thiết kế riêng khung Candidate Task Card (Cue Card) + ô ghi chú nháp cho Part 2',
                  },
                  {
                    key: 'c4',
                    label: 'Hiển thị tiến độ làm bài, Transcript, nhận xét luyện tập sơ bộ và nút tải JSON',
                  },
                  {
                    key: 'c5',
                    label: 'Xử lý đầy đủ lỗi chưa nhập câu trả lời, quá 5000 ký tự, lỗi Agent và lỗi Session ID',
                  },
                  {
                    key: 'c6',
                    label: 'Có đủ 3 commit rõ nghĩa trên nhánh feature/streamlit-ui và chạy pass 18 test pytest',
                  },
                ].map((item) => {
                  const checked = !!checklist[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleChecklist(item.key)}
                      className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-colors cursor-pointer"
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <span className={checked ? 'font-medium text-slate-900' : 'text-slate-600'}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interface Contract Table with TV2, TV3, TV4 */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Hợp đồng hàm giao tiếp (API Contract) giữa TV1 và nhóm
              </h2>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-900">TV1 ↔ TV2 (src/examiner_agent.py)</div>
                  <code className="block font-mono text-[11px] text-sky-800 mt-1">
                    run_agent(sid, action, question_id=..., answer=..., live_llm=live)
                  </code>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-900">TV1 ↔ TV3 (src/storage.py &amp; src/bank.py)</div>
                  <code className="block font-mono text-[11px] text-sky-800 mt-1">
                    init_db(), start_session(), current_question(sid), progress(sid), transcript(sid), load_tracks()
                  </code>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="font-semibold text-slate-900">TV1 ↔ TV4 (src/trace.py)</div>
                  <code className="block font-mono text-[11px] text-sky-800 mt-1">
                    recent_logs(sid, limit=40)
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
