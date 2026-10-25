/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { TopBar, ActiveTab } from './components/TopBar';
import { MockTestWorkspace } from './components/MockTestWorkspace';
import { TranscriptTraceView } from './components/TranscriptTraceView';
import {
  SpeakingStore,
  TopicTrack,
  createDemoSeedSessions,
} from './engine/speakingEngine';

export default function App() {
  const storeRef = useRef<SpeakingStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = new SpeakingStore(createDemoSeedSessions());
  }
  const store = storeRef.current;

  const initialSessions = store.getAllSessions();
  const [activeTab, setActiveTab] = useState<ActiveTab>('mock-test');
  const [activeSessionId, setActiveSessionId] = useState<string>(
    initialSessions[0]?.id || store.startSession('minh_anh_uit', 'study')
  );
  const [, setVersion] = useState(0);

  const refresh = () => setVersion((v) => v + 1);

  const handleStartNewSession = (learnerId: string, track: TopicTrack, liveMode: boolean) => {
    const sid = store.startSession(learnerId, track);
    store.runAgent(sid, 'start', { mode: liveMode ? 'llm' : 'scripted' });
    setActiveSessionId(sid);
    setActiveTab('mock-test');
    refresh();
  };

  const handleLoadSession = (sessionId: string): { ok: boolean; error?: string } => {
    try {
      store.progress(sessionId);
      setActiveSessionId(sessionId.trim());
      setActiveTab('mock-test');
      refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Session does not exist',
      };
    }
  };

  const handleJumpToPart = (targetPart: 1 | 2 | 3) => {
    setActiveTab('mock-test');
    const all = store.getAllSessions();
    const matching = all.find((s) => {
      const q = store.currentQuestion(s.id);
      return q && q.part === targetPart;
    });
    if (matching) {
      setActiveSessionId(matching.id);
      refresh();
    }
  };

  const handleSubmitAnswer = (
    questionId: string,
    answer: string,
    liveMode: boolean
  ): { ok: boolean; error?: string; toolsCalled?: string[] } => {
    try {
      const before = store.progress(activeSessionId).completed;
      const result = store.runAgent(activeSessionId, 'submit', {
        questionId,
        answer,
        mode: liveMode ? 'llm' : 'scripted',
      });
      refresh();
      if (result.progress.completed !== before + 1) {
        return {
          ok: false,
          error: 'The agent did not save the answer. Try again or inspect logs.',
        };
      }
      return { ok: true, toolsCalled: result.tools_called };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Agent execution error',
      };
    }
  };

  const progressState = store.progress(activeSessionId);
  const currentQ = store.currentQuestion(activeSessionId);
  const transcriptRows = store.transcript(activeSessionId);
  const traceEvents = store.recentLogs(activeSessionId);
  const allSessions = store.getAllSessions();
  const activePart: 1 | 2 | 3 = currentQ ? currentQ.part : 3;

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8FA] text-[#3B1D38]">
      <TopBar
        activeTab={activeTab}
        activePart={activePart}
        onSelectTab={setActiveTab}
        onJumpToPart={handleJumpToPart}
        onQuickStartNew={() => handleStartNewSession(progressState.learner_id || 'minh_anh_uit', progressState.track || 'study', false)}
      />

      <main className="flex-1">
        {activeTab === 'mock-test' ? (
          <MockTestWorkspace
            activeSessionId={activeSessionId}
            progressState={progressState}
            currentQ={currentQ}
            transcriptRows={transcriptRows}
            traceEvents={traceEvents}
            allSessions={allSessions}
            onStartNewSession={handleStartNewSession}
            onLoadSession={handleLoadSession}
            onSubmitAnswer={handleSubmitAnswer}
            onOpenTranscriptTab={() => setActiveTab('transcript-trace')}
          />
        ) : (
          <TranscriptTraceView
            activeSessionId={activeSessionId}
            progressState={progressState}
            transcriptRows={transcriptRows}
            traceEvents={traceEvents}
            onBackToTest={() => setActiveTab('mock-test')}
          />
        )}
      </main>

      <footer className="border-t border-pink-200/80 bg-white px-6 py-4 text-xs text-[#8E5B80] flex flex-wrap items-center justify-between gap-4">
        <div>
          🍓 CozySpeak IELTS · Bộ câu hỏi tự biên soạn phục vụ luyện tập (<code className="font-mono text-pink-700">source: self_written</code>), không phải đề thi IELTS chính thức.
        </div>
        <div>
          Speaking Mock Test · Part 1 → Part 2 Cue Card → Part 3 Discussion
        </div>
      </footer>
    </div>
  );
}
