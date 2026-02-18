'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

/* ─── Types ─── */
interface QuestionOption {
  _id: string;
  text: string;
  imageUrl?: string;
}

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  questionType: 'mcq-single' | 'mcq-multiple' | 'true-false';
  options: QuestionOption[];
  imageUrl?: string;
  marks: number;
  negativeMarks: number;
  section?: string;
}

interface Answer {
  selectedOptions: string[];
  markedForReview: boolean;
  visited: boolean;
}

/* ─── Main Component ─── */
export default function SecureExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  // Exam state
  const [phase, setPhase] = useState<'loading' | 'preflight' | 'exam' | 'submitting' | 'submitted'>('loading');
  const [examTitle, setExamTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [attemptId, setAttemptId] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Proctoring state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationMsg, setViolationMsg] = useState('');
  const [showViolationPopup, setShowViolationPopup] = useState(false);
  const MAX_VIOLATIONS = 5;

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Calculator
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const saveRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number>(0);
  const violationCountRef = useRef(0);
  const attemptIdRef = useRef('');
  const answersRef = useRef<Map<string, Answer>>(new Map());
  const timeRemainingRef = useRef(0);
  const handleAutoSubmitRef = useRef<(reason: string) => void>(() => {});

  /* ═══════════════════════════════════════════════
     1. INITIALIZE EXAM
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    const init = async () => {
      try {
        const res = await api.post(`/student/exams/${examId}/start`);
        const d = res.data.data;

        const subId = d.submission?.id || d.submission?._id;
        setAttemptId(subId);
        attemptIdRef.current = subId;
        setExamTitle(d.examTitle || d.submission?.examTitle || 'Examination');
        const loadedQuestions = d.questions || [];
        setQuestions(loadedQuestions);

        // Use server-provided remaining time; fallback to duration, NEVER give extra time
        const serverRemaining = d.state?.remainingTime ?? d.submission?.remainingTime ?? 0;
        if (serverRemaining <= 0) {
          // Time already expired — auto-submit
          toast.error('Exam time has expired. Auto-submitting...');
          try {
            await api.post(`/student/submissions/${d.submission?.id || d.submission?._id}/submit`, { autoSubmit: true });
          } catch {}
          router.push(`/my/exams/${examId}/confirmation?submissionId=${d.submission?.id || d.submission?._id}`);
          return;
        }
        setTimeRemaining(serverRemaining);
        timeRemainingRef.current = serverRemaining;

        // Guard: if no questions loaded, redirect back
        if (loadedQuestions.length === 0) {
          toast.error('No questions found for this exam');
          router.push(`/my/exams/${examId}`);
          return;
        }

        // Restore answers from server
        const ansMap = new Map<string, Answer>();
        if (d.state?.submissionAnswers?.length) {
          d.state.submissionAnswers.forEach((a: any) => {
            ansMap.set(a.questionId, {
              selectedOptions: a.selectedOptions || [],
              markedForReview: a.markedForReview || false,
              visited: a.visited || false,
            });
          });
        }
        // Init unanswered questions
        (d.questions || []).forEach((q: Question) => {
          if (!ansMap.has(q._id)) {
            ansMap.set(q._id, { selectedOptions: [], markedForReview: false, visited: false });
          }
        });
        setAnswers(ansMap);
        answersRef.current = ansMap;
        setViolationCount(d.submission?.totalViolations || 0);
        violationCountRef.current = d.submission?.totalViolations || 0;
        setPhase('preflight');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load exam');
        router.push(`/my/exams/${examId}`);
      }
    };
    init();
  }, [examId, router]);

  /* ═══════════════════════════════════════════════
     2. CAMERA — Start webcam
     ═══════════════════════════════════════════════ */
  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      });
      setCameraStream(stream);
      setCameraError('');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch {
      setCameraError('Camera access denied. Proctoring requires camera.');
      return false;
    }
  }, []);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      cameraStream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

  /* ═══════════════════════════════════════════════
     3. MICROPHONE — Audio level monitoring
     ═══════════════════════════════════════════════ */
  const startMicrophone = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(stream);
      setMicError('');

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        micAnimRef.current = requestAnimationFrame(poll);
      };
      poll();
      return true;
    } catch {
      setMicError('Microphone access denied.');
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(micAnimRef.current);
      audioCtxRef.current?.close();
      micStream?.getTracks().forEach(t => t.stop());
    };
  }, [micStream]);

  /* ═══════════════════════════════════════════════
     4. FULLSCREEN
     ═══════════════════════════════════════════════ */
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch {
      console.warn('Fullscreen not supported');
    }
  }, []);

  useEffect(() => {
    if (phase !== 'exam') return;
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        recordViolation('fullscreen-exit', 'Exited fullscreen mode');
      } else {
        setIsFullscreen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [phase]);

  /* ═══════════════════════════════════════════════
     5. VIOLATION RECORDING
     ═══════════════════════════════════════════════ */
  const recordViolation = useCallback(async (type: string, desc: string) => {
    const newCount = violationCountRef.current + 1;
    violationCountRef.current = newCount;
    setViolationCount(newCount);
    setViolationMsg(`⚠️ Violation #${newCount}: ${desc}`);
    setShowViolationPopup(true);
    setTimeout(() => setShowViolationPopup(false), 4000);

    try {
      if (attemptIdRef.current) {
        await api.post(`/student/submissions/${attemptIdRef.current}/violation`, {
          type,
          description: desc,
        });
      }
    } catch { /* silent */ }

    if (newCount >= MAX_VIOLATIONS) {
      handleAutoSubmitRef.current('Exceeded maximum violations');
    }
  }, []);

  /* ═══════════════════════════════════════════════
     6. SECURITY EVENT LISTENERS
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== 'exam') return;

    const onVisChange = () => {
      if (document.hidden) recordViolation('tab-switch', 'Switched to another tab');
    };
    const onBlur = () => recordViolation('window-blur', 'Window lost focus');
    const onCtxMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('right-click', 'Right-click attempt');
    };
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); recordViolation('copy-attempt', 'Copy attempt'); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); recordViolation('paste-attempt', 'Paste attempt'); };
    const onCut = (e: ClipboardEvent) => { e.preventDefault(); recordViolation('copy-attempt', 'Cut attempt'); };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (
        (e.ctrlKey && ['c', 'v', 'a', 'u', 's', 'p', 'f'].includes(key)) ||
        e.key === 'F12' || e.key === 'PrintScreen' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.altKey && key === 'tab')
      ) {
        e.preventDefault();
        recordViolation('keyboard-shortcut', `Blocked: ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
      }
    };
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
      recordViolation('navigation', 'Back/forward navigation attempt');
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.history.pushState(null, '', window.location.href);
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onCtxMenu);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('cut', onCut);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onCtxMenu);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('cut', onCut);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [phase, recordViolation]);

  /* DevTools detection */
  useEffect(() => {
    if (phase !== 'exam') return;
    let devOpen = false;
    const check = () => {
      const w = window.outerWidth - window.innerWidth > 160;
      const h = window.outerHeight - window.innerHeight > 160;
      if ((w || h) && !devOpen) {
        devOpen = true;
        recordViolation('devtools-open', 'Developer tools detected');
      } else if (!w && !h) {
        devOpen = false;
      }
    };
    const iv = setInterval(check, 2000);
    return () => clearInterval(iv);
  }, [phase, recordViolation]);

  /* ═══════════════════════════════════════════════
     7. TIMER
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== 'exam' || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 1;
        timeRemainingRef.current = next;
        if (next <= 0) {
          handleAutoSubmit('Time expired');
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  /* ═══════════════════════════════════════════════
     8. AUTO-SAVE (every 30s)
     ═══════════════════════════════════════════════ */
  useEffect(() => {
    if (phase !== 'exam' || !attemptId) return;
    saveRef.current = setInterval(() => saveProgress(), 30000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [phase, attemptId]);

  const saveProgress = async () => {
    if (!attemptIdRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const currentAnswers = answersRef.current;
      const currentTime = timeRemainingRef.current;
      const arr = Array.from(currentAnswers.entries()).map(([qId, a]) => ({
        questionId: qId,
        selectedOptions: a.selectedOptions,
        markedForReview: a.markedForReview,
        visited: a.visited,
      }));
      const res = await api.post(`/student/submissions/${attemptIdRef.current}/answers`, {
        answers: arr,
        timeRemaining: currentTime,
      });
      setLastSaved(new Date());
      // Sync timer with server to prevent drift
      if (res.data?.data?.remainingTime !== undefined) {
        const serverTime = res.data.data.remainingTime;
        // Only sync if drift is more than 3 seconds
        if (Math.abs(serverTime - timeRemainingRef.current) > 3) {
          setTimeRemaining(serverTime);
          timeRemainingRef.current = serverTime;
        }
      }
    } catch { /* silent */ }
    setIsSaving(false);
  };

  /* ═══════════════════════════════════════════════
     9. PREFLIGHT → Start exam
     ═══════════════════════════════════════════════ */
  const beginExam = async () => {
    const cameraOk = await startCamera();
    await startMicrophone();
    // If camera failed, still allow exam but show warning
    if (!cameraOk) {
      const proceed = window.confirm(
        'Camera access was denied. Your exam will not be proctored. Continue anyway?'
      );
      if (!proceed) return;
    }
    await enterFullscreen();
    setPhase('exam');
  };

  /* ═══════════════════════════════════════════════
     10. ANSWER HANDLING
     ═══════════════════════════════════════════════ */
  const handleSelectOption = (optionId: string) => {
    const q = questions[currentIdx];
    const cur = answers.get(q._id) || { selectedOptions: [], markedForReview: false, visited: true };

    let newSel: string[];
    if (q.questionType === 'mcq-multiple') {
      newSel = cur.selectedOptions.includes(optionId)
        ? cur.selectedOptions.filter(id => id !== optionId)
        : [...cur.selectedOptions, optionId];
    } else {
      newSel = [optionId];
    }

    const updated = new Map(answers);
    updated.set(q._id, { ...cur, selectedOptions: newSel, visited: true });
    setAnswers(updated);
    answersRef.current = updated;
  };

  const toggleFlag = () => {
    const q = questions[currentIdx];
    const cur = answers.get(q._id) || { selectedOptions: [], markedForReview: false, visited: true };
    const updated = new Map(answers);
    updated.set(q._id, { ...cur, markedForReview: !cur.markedForReview, visited: true });
    setAnswers(updated);
    answersRef.current = updated;
  };

  const clearResponse = () => {
    const q = questions[currentIdx];
    const updated = new Map(answers);
    updated.set(q._id, { selectedOptions: [], markedForReview: false, visited: true });
    setAnswers(updated);
    answersRef.current = updated;
  };

  /* ═══════════════════════════════════════════════
     11. SUBMIT
     ═══════════════════════════════════════════════ */
  const handleAutoSubmit = async (reason: string) => {
    setPhase('submitting');
    try {
      await saveProgress();
      await api.post(`/student/submissions/${attemptIdRef.current}/submit`, { reason, autoSubmit: true });
    } catch { /* silent */ }
    cleanup();
    setPhase('submitted');
    setTimeout(() => router.push(`/my/exams/${examId}/confirmation?submissionId=${attemptIdRef.current}`), 2000);
  };

  // Keep handleAutoSubmitRef in sync so stale closures always call the latest version
  handleAutoSubmitRef.current = handleAutoSubmit;

  const handleSubmit = async () => {
    setPhase('submitting');
    try {
      await saveProgress();
      await api.post(`/student/submissions/${attemptIdRef.current}/submit`);
      toast.success('Exam submitted successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Submit failed');
      setPhase('exam');
      setShowSubmitModal(false);
      return;
    }
    cleanup();
    router.push(`/my/exams/${examId}/confirmation?submissionId=${attemptIdRef.current}`);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (saveRef.current) clearInterval(saveRef.current);
    cancelAnimationFrame(micAnimRef.current);
    audioCtxRef.current?.close();
    cameraStream?.getTracks().forEach(t => t.stop());
    micStream?.getTracks().forEach(t => t.stop());
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  /* ═══════════════════════════════════════════════
     12. CALCULATOR
     ═══════════════════════════════════════════════ */
  const calcInput = (v: string) => {
    if (v === 'C') setCalcDisplay('0');
    else if (v === 'BS') setCalcDisplay(d => d.length > 1 ? d.slice(0, -1) : '0');
    else if (v === '=') {
      try { setCalcDisplay(String(Function('"use strict";return (' + calcDisplay + ')')())); }
      catch { setCalcDisplay('Error'); }
    } else {
      setCalcDisplay(d => d === '0' || d === 'Error' ? v : d + v);
    }
  };

  /* ═══════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════ */
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  const getStats = () => {
    let answered = 0, flagged = 0;
    questions.forEach(q => {
      const a = answers.get(q._id);
      if (a?.selectedOptions?.length) answered++;
      if (a?.markedForReview) flagged++;
    });
    return { answered, flagged, unanswered: questions.length - answered, total: questions.length };
  };

  const getQuestionLabel = (q: Question) => {
    if (q.questionType === 'mcq-multiple') return 'Select all that apply';
    if (q.questionType === 'true-false') return 'Select True or False';
    return 'Select one answer';
  };

  /* ═══════════════════════════════════════════════
     RENDER: LOADING
     ═══════════════════════════════════════════════ */
  if (phase === 'loading') {
    return (
      <div className="proctor-fullpage">
        <div className="proctor-center-card">
          <div className="proctor-spinner"></div>
          <h2>Preparing Examination Environment</h2>
          <p>Please wait while we load your exam...</p>
        </div>
      </div>
    );
  }

  /* RENDER: SUBMITTING / SUBMITTED */
  if (phase === 'submitting' || phase === 'submitted') {
    return (
      <div className="proctor-fullpage">
        <div className="proctor-center-card">
          {phase === 'submitting' ? (
            <>
              <div className="proctor-spinner"></div>
              <h2>Submitting Your Exam</h2>
              <p>Please do not close this window...</p>
            </>
          ) : (
            <>
              <div className="proctor-check-icon">✓</div>
              <h2>Exam Submitted</h2>
              <p>Redirecting to confirmation page...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: PREFLIGHT CHECK
     ═══════════════════════════════════════════════ */
  if (phase === 'preflight') {
    return (
      <div className="proctor-fullpage">
        <div className="proctor-preflight-card">
          <div className="proctor-preflight-header">
            <div className="proctor-shield-icon">🛡️</div>
            <h1>Secure Exam Environment</h1>
            <h2>{examTitle}</h2>
          </div>

          <div className="proctor-preflight-body">
            <p className="proctor-preflight-intro">
              This exam uses advanced proctoring. The following will be activated when you start:
            </p>

            <div className="proctor-preflight-items">
              <div className="proctor-preflight-item">
                <span className="proctor-check-badge">📷</span>
                <div>
                  <strong>Webcam Recording</strong>
                  <p>Your camera will be turned on for identity verification and monitoring.</p>
                </div>
              </div>
              <div className="proctor-preflight-item">
                <span className="proctor-check-badge">🎤</span>
                <div>
                  <strong>Microphone Monitoring</strong>
                  <p>Audio levels will be monitored to detect conversations.</p>
                </div>
              </div>
              <div className="proctor-preflight-item">
                <span className="proctor-check-badge">🖥️</span>
                <div>
                  <strong>Fullscreen Lock</strong>
                  <p>The exam will run in fullscreen mode. Exiting is a violation.</p>
                </div>
              </div>
              <div className="proctor-preflight-item">
                <span className="proctor-check-badge">🔒</span>
                <div>
                  <strong>Activity Monitoring</strong>
                  <p>Tab switches, copy/paste, right-click, and shortcuts are blocked and recorded.</p>
                </div>
              </div>
            </div>

            <div className="proctor-preflight-rules">
              <h3>⚠️ Important Rules</h3>
              <ul>
                <li>Do NOT switch tabs or windows during the exam</li>
                <li>Do NOT use any external applications</li>
                <li>Do NOT open developer tools</li>
                <li>Stay in fullscreen mode at all times</li>
                <li>Maximum {MAX_VIOLATIONS} violations allowed — exam auto-submits after that</li>
              </ul>
            </div>

            <div className="proctor-exam-info">
              <div className="proctor-info-item">
                <span>Questions</span>
                <strong>{questions.length}</strong>
              </div>
              <div className="proctor-info-item">
                <span>Time</span>
                <strong>{formatTime(timeRemaining)}</strong>
              </div>
              <div className="proctor-info-item">
                <span>Violations Used</span>
                <strong>{violationCount} / {MAX_VIOLATIONS}</strong>
              </div>
            </div>

            <button className="proctor-start-btn" onClick={beginExam}>
              🚀 Start Secure Exam
            </button>
            <p className="proctor-preflight-note">
              By clicking Start, you agree to the proctoring conditions above.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════
     RENDER: EXAM INTERFACE
     ═══════════════════════════════════════════════ */
  const q = questions[currentIdx];
  const ans = q ? answers.get(q._id) : undefined;
  const stats = getStats();
  const isWarning = timeRemaining < 600 && timeRemaining >= 120;
  const isCritical = timeRemaining < 120;

  // Guard: if questions not loaded yet or empty
  if (!q) {
    return (
      <div className="proctor-exam">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff' }}>
          <div>Loading questions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="proctor-exam">
      {showViolationPopup && (
        <div className="proctor-violation-toast">{violationMsg}</div>
      )}

      {!isFullscreen && (
        <div className="proctor-fs-reminder" onClick={enterFullscreen}>
          ⚠️ Fullscreen required — Click here to re-enter fullscreen
        </div>
      )}

      {/* HEADER */}
      <header className="proctor-header">
        <div className="proctor-header-left">
          <div className="proctor-exam-title">{examTitle}</div>
          <div className="proctor-exam-meta">
            Question {currentIdx + 1} / {questions.length}
            {q?.section && q.section !== 'General' && <span> · {q.section}</span>}
          </div>
        </div>

        <div className="proctor-header-center">
          <div className="proctor-indicators">
            <div className={`proctor-indicator ${cameraStream ? 'active' : 'error'}`} title="Camera">
              📷 {cameraStream ? 'ON' : 'OFF'}
            </div>
            <div className={`proctor-indicator ${micStream ? 'active' : 'error'}`} title="Microphone">
              🎤 {micStream ? 'ON' : 'OFF'}
            </div>
            <div className={`proctor-indicator ${isFullscreen ? 'active' : 'error'}`} title="Fullscreen">
              🖥️ {isFullscreen ? 'FS' : '!FS'}
            </div>
            <div className={`proctor-indicator ${violationCount > 3 ? 'error' : violationCount > 0 ? 'warn' : 'active'}`}>
              ⚠️ {violationCount}/{MAX_VIOLATIONS}
            </div>
          </div>
        </div>

        <div className="proctor-header-right">
          <div className="proctor-save-status">
            {isSaving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Auto-save ON'}
          </div>
          <div className={`proctor-timer ${isWarning ? 'warning' : ''} ${isCritical ? 'critical' : ''}`}>
            🕐 {formatTime(timeRemaining)}
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="proctor-body">
        <aside className="proctor-sidebar">
          {/* Camera feed */}
          <div className="proctor-camera-box">
            <div className="proctor-camera-label">
              <span className="proctor-live-dot"></span> LIVE
            </div>
            {cameraError ? (
              <div className="proctor-camera-error">{cameraError}</div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="proctor-camera-video" />
            )}
          </div>

          {/* Audio level */}
          <div className="proctor-mic-box">
            <div className="proctor-mic-label">🎤 Audio Level</div>
            <div className="proctor-mic-bar-bg">
              <div
                className={`proctor-mic-bar ${micLevel > 60 ? 'high' : micLevel > 30 ? 'mid' : 'low'}`}
                style={{ width: `${micLevel}%` }}
              ></div>
            </div>
            {micError && <div className="proctor-mic-error">{micError}</div>}
          </div>

          {/* Question navigator */}
          <div className="proctor-nav-section">
            <div className="proctor-nav-title">Questions</div>
            <div className="proctor-nav-grid">
              {questions.map((qq, idx) => {
                const a = answers.get(qq._id);
                const isAns = !!a?.selectedOptions?.length;
                const isFlag = !!a?.markedForReview;
                const isCur = idx === currentIdx;
                let cls = 'proctor-nav-btn';
                if (isCur) cls += ' current';
                else if (isFlag && isAns) cls += ' answered-flagged';
                else if (isFlag) cls += ' flagged';
                else if (isAns) cls += ' answered';
                else if (a?.visited) cls += ' visited';
                return (
                  <button key={qq._id} className={cls} onClick={() => setCurrentIdx(idx)}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="proctor-nav-legend">
              <span><i className="legend-box current"></i> Current</span>
              <span><i className="legend-box answered"></i> Answered</span>
              <span><i className="legend-box flagged"></i> Flagged</span>
              <span><i className="legend-box visited"></i> Visited</span>
              <span><i className="legend-box"></i> Not Visited</span>
            </div>
            <div className="proctor-nav-stats">
              <div>Answered: <strong>{stats.answered}</strong></div>
              <div>Unanswered: <strong>{stats.unanswered}</strong></div>
              <div>Flagged: <strong>{stats.flagged}</strong></div>
            </div>
          </div>
        </aside>

        {/* Main question area */}
        <main className="proctor-main">
          <div className="proctor-question-card">
            <div className="proctor-q-header">
              <span className="proctor-q-num">
                Q{currentIdx + 1}
                {ans?.markedForReview && <span className="proctor-flag-badge">⚑ FLAGGED</span>}
              </span>
              <span className="proctor-q-marks">
                {q.marks} Mark{q.marks > 1 ? 's' : ''}
                {q.negativeMarks > 0 && <span className="proctor-neg-marks"> (−{q.negativeMarks})</span>}
              </span>
            </div>

            <div className="proctor-q-text">{q.questionText}</div>

            {q.imageUrl && (
              <div className="proctor-q-image">
                <img src={q.imageUrl} alt="Question" />
              </div>
            )}

            <div className="proctor-q-instruction">{getQuestionLabel(q)}</div>

            <div className="proctor-options">
              {q.options.map((opt, oi) => {
                const letter = String.fromCharCode(65 + oi);
                const isSelected = ans?.selectedOptions?.includes(opt._id);
                const inputType = q.questionType === 'mcq-multiple' ? 'checkbox' : 'radio';

                return (
                  <label
                    key={opt._id}
                    className={`proctor-option ${isSelected ? 'selected' : ''}`}
                    htmlFor={`opt-${opt._id}`}
                  >
                    <input
                      type={inputType}
                      id={`opt-${opt._id}`}
                      name={`q-${q._id}`}
                      checked={!!isSelected}
                      onChange={() => handleSelectOption(opt._id)}
                    />
                    <span className={`proctor-option-marker ${inputType}`}>
                      {isSelected ? (inputType === 'checkbox' ? '✓' : '●') : letter}
                    </span>
                    <span className="proctor-option-text">{opt.text}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="proctor-actions">
            <div className="proctor-actions-left">
              <button className="proctor-btn secondary" onClick={clearResponse}>Clear Response</button>
              <button className={`proctor-btn ${ans?.markedForReview ? 'flagged' : 'secondary'}`} onClick={toggleFlag}>
                {ans?.markedForReview ? '⚑ Unflag' : '⚐ Flag for Review'}
              </button>
              <button className="proctor-btn secondary" onClick={() => setShowCalc(!showCalc)}>🧮 Calculator</button>
            </div>
            <div className="proctor-actions-right">
              <button className="proctor-btn secondary" onClick={saveProgress} disabled={isSaving}>
                💾 {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="proctor-footer">
        <div className="proctor-footer-left">
          <button className="proctor-btn" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0}>
            ← Previous
          </button>
          <button className="proctor-btn" onClick={() => setCurrentIdx(Math.min(questions.length - 1, currentIdx + 1))} disabled={currentIdx === questions.length - 1}>
            Next →
          </button>
        </div>
        <div className="proctor-footer-center">
          {stats.answered}/{stats.total} answered · {stats.flagged} flagged
        </div>
        <button className="proctor-btn danger" onClick={() => setShowSubmitModal(true)}>Submit Exam</button>
      </footer>

      {/* CALCULATOR */}
      {showCalc && (
        <div className="proctor-calc-popup">
          <div className="proctor-calc-header">
            <strong>Calculator</strong>
            <button onClick={() => setShowCalc(false)}>✕</button>
          </div>
          <input type="text" value={calcDisplay} readOnly className="proctor-calc-display" title="Calculator display" aria-label="Calculator display" />
          <div className="proctor-calc-grid">
            {['7','8','9','/',  '4','5','6','*',  '1','2','3','-',  '0','.','=','+',  'C','BS'].map(k => (
              <button key={k} onClick={() => calcInput(k)} className="proctor-calc-btn">{k}</button>
            ))}
          </div>
        </div>
      )}

      {/* SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="proctor-modal-overlay" onClick={() => setShowSubmitModal(false)}>
          <div className="proctor-modal" onClick={e => e.stopPropagation()}>
            <h2>Confirm Submission</h2>
            <div className="proctor-modal-stats">
              <div className="proctor-modal-stat">
                <span>Total Questions</span>
                <strong>{stats.total}</strong>
              </div>
              <div className="proctor-modal-stat green">
                <span>Answered</span>
                <strong>{stats.answered}</strong>
              </div>
              <div className="proctor-modal-stat red">
                <span>Unanswered</span>
                <strong>{stats.unanswered}</strong>
              </div>
              <div className="proctor-modal-stat amber">
                <span>Flagged</span>
                <strong>{stats.flagged}</strong>
              </div>
            </div>
            {stats.unanswered > 0 && (
              <div className="proctor-modal-warning">
                ⚠️ You have {stats.unanswered} unanswered question{stats.unanswered > 1 ? 's' : ''}.
              </div>
            )}
            <p className="proctor-modal-note">
              This action cannot be undone. Once submitted, you cannot modify your answers.
            </p>
            <div className="proctor-modal-actions">
              <button className="proctor-btn secondary" onClick={() => setShowSubmitModal(false)}>Cancel — Go Back</button>
              <button className="proctor-btn danger" onClick={handleSubmit}>✓ Confirm Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
