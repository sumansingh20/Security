'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface Question {
  id: string;
  index: number;
  text: string;
  type: 'mcq' | 'mcq_multiple' | 'true_false' | 'short_answer' | 'numerical' | 'essay' | 'matching' | 'ordering' | 'fill_blank' | 'image_based' | 'code';
  backendType?: string;
  options?: { text: string; _id?: string }[];
  marks: number;
  imageUrl?: string;
  matchPairs?: { left: string; right?: string }[];
  matchRightOptions?: string[];
  orderItems?: string[];
  codeLanguage?: string;
  answerTolerance?: number;
}

interface Answer {
  questionId: string;
  selectedOption?: number;
  selectedOptions?: number[];
  textAnswer?: string;
  matchAnswers?: string[];
  orderAnswer?: string[];
}

interface SessionData {
  remainingTime: number;
  serverTime: string;
  status: string;
  violationCount: number;
  maxViolations: number;
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [remainingTime, setRemainingTime] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(5);
  const [submitted, setSubmitted] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [terminationReason, setTerminationReason] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [warningMessage, setWarningMessage] = useState('');
  const [allowManualSubmission, setAllowManualSubmission] = useState(true);

  // Proctoring state
  const [requireCamera, setRequireCamera] = useState(false);
  const [requireMicrophone, setRequireMicrophone] = useState(false);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [micError, setMicError] = useState('');

  // Refs for violation detection
  const windowFocusRef = useRef(true);
  const lastActivityRef = useRef(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const fingerprintRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micAnimRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => { sessionTokenRef.current = sessionToken; }, [sessionToken]);
  useEffect(() => { fingerprintRef.current = fingerprint; }, [fingerprint]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false,
      });
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack || videoTrack.readyState !== 'live') {
        setCameraError('Camera stream is not active.');
        return;
      }
      setCameraStream(stream);
      setCameraError('');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { await videoRef.current.play(); } catch {}
      }
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera in browser settings.'
        : err?.name === 'NotFoundError'
        ? 'No camera found.'
        : err?.name === 'NotReadableError'
        ? 'Camera is in use by another application.'
        : 'Camera access failed.';
      setCameraError(msg);
    }
  }, []);

  // Wire camera stream to video element
  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch(() => {});
  }, [cameraStream]);

  // Start microphone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      setMicStream(stream);
      setMicError('');

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        if (audioCtx.state === 'closed') return;
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        micAnimRef.current = requestAnimationFrame(poll);
      };
      poll();
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow mic in browser settings.'
        : err?.name === 'NotFoundError'
        ? 'No microphone found.'
        : 'Microphone access failed.';
      setMicError(msg);
    }
  }, []);

  // Cleanup camera/mic on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(micAnimRef.current);
      audioCtxRef.current?.close();
      cameraStream?.getTracks().forEach(t => t.stop());
      micStream?.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream, micStream]);

  // Fullscreen enforcement
  useEffect(() => {
    if (!requireFullscreen || loading || submitted || terminated) return;
    const handleFsChange = () => {
      if (!document.fullscreenElement) {
        reportViolation('fullscreen_exit', 'Exited fullscreen mode');
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [requireFullscreen, loading, submitted, terminated]);

  // Get browser fingerprint with timeout to prevent stuck loading
  useEffect(() => {
    let cancelled = false;
    const getFingerprint = async () => {
      const generateFallback = () => {
        const fallback = `${navigator.userAgent}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`;
        return btoa(fallback).substring(0, 32);
      };
      try {
        // Race between FingerprintJS and a timeout
        const fpPromise = FingerprintJS.load().then(fp => fp.get());
        const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Fingerprint timeout')), 5000));
        const result = await Promise.race([fpPromise, timeoutPromise]) as any;
        if (!cancelled) {
          setFingerprint(result.visitorId);
          fingerprintRef.current = result.visitorId;
        }
      } catch (err) {
        console.error('Fingerprint error:', err);
        if (!cancelled) {
          const fp = generateFallback();
          setFingerprint(fp);
          fingerprintRef.current = fp;
        }
      }
    };
    getFingerprint();
    return () => { cancelled = true; };
  }, []);

  // Load session from storage or validate existing
  useEffect(() => {
    if (!fingerprint) return;

    const storedToken = sessionStorage.getItem(`exam_session_${examId}`);
    if (storedToken) {
      setSessionToken(storedToken);
      sessionTokenRef.current = storedToken;
      loadExamSession(storedToken);
    } else {
      setLoading(false);
      setError('No active session. Please login through the exam portal.');
    }
  }, [examId, fingerprint]);

  // Load exam session data with retry
  const loadExamSession = async (token: string, retryCount = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}/exam-engine/session/${token}`, {
        headers: {
          'x-browser-fingerprint': fingerprintRef.current || fingerprint || '',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); } catch { data = { reason: `Server error (${response.status})` }; }
        
        // Retry on server errors (5xx)
        if (response.status >= 500 && retryCount < 2) {
          console.log(`Retrying session load (attempt ${retryCount + 2})...`);
          await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
          return loadExamSession(token, retryCount + 1);
        }
        
        setError(data?.reason || data?.error || `Server error (${response.status})`);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        if (data.terminated) {
          setTerminated(true);
          setTerminationReason(data.reason || 'Session terminated');
        } else {
          setError(data.reason || 'Failed to load session');
        }
        setLoading(false);
        return;
      }

      setExamTitle(data.exam.title);
      setQuestions(data.questions || []);
      setTotalQuestions(data.questions?.length || 0);
      setRemainingTime(data.session.remainingTime);
      setViolationCount(data.session.violationCount);
      setMaxViolations(data.session.maxViolations);
      setCurrentQuestion(data.session.currentQuestionIndex);
      setAllowManualSubmission(data.exam.allowManualSubmission !== false);

      // Set proctoring flags and start camera/mic if required
      const camRequired = data.exam.requireCamera === true;
      const micRequired = data.exam.requireMicrophone === true;
      const fsRequired = data.exam.requireFullscreen !== false;
      setRequireCamera(camRequired);
      setRequireMicrophone(micRequired);
      setRequireFullscreen(fsRequired);
      if (camRequired) startCamera();
      if (micRequired) startMicrophone();
      if (fsRequired && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      // Load saved answers - restore matching/ordering state from textAnswer
      const savedAnswers = new Map<string, Answer>();
      const questionMap = new Map<string, Question>();
      (data.questions || []).forEach((q: Question) => questionMap.set(q.id, q));
      
      data.answers?.forEach((a: any) => {
        const answer: Answer = {
          questionId: a.questionId,
          selectedOption: a.selectedOption,
          selectedOptions: a.selectedOptions,
          textAnswer: a.textAnswer,
        };
        // Restore matchAnswers/orderAnswer from textAnswer for matching/ordering questions
        const q = questionMap.get(a.questionId);
        if (q && a.textAnswer) {
          if (q.type === 'matching') {
            try { answer.matchAnswers = JSON.parse(a.textAnswer); } catch {}
          } else if (q.type === 'ordering') {
            try { answer.orderAnswer = JSON.parse(a.textAnswer); } catch {}
          }
        }
        savedAnswers.set(a.questionId, answer);
      });
      setAnswers(savedAnswers);

      setLoading(false);
      startTimerAndHeartbeat(data.session.remainingTime);
    } catch (err: any) {
      console.error('Load session error:', err);
      // Retry on network errors
      if (retryCount < 2 && (err.name === 'AbortError' || err.name === 'TypeError' || !navigator.onLine)) {
        console.log(`Retrying session load after network error (attempt ${retryCount + 2})...`);
        await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
        return loadExamSession(token, retryCount + 1);
      }
      setError('Failed to connect to exam server. Please check your internet connection and try again.');
      setLoading(false);
    }
  };

  // Start timer and heartbeat
  const startTimerAndHeartbeat = (initialTime: number) => {
    // Clear any existing timers to prevent leaks on re-mount
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

    // Use ref for accurate time tracking across heartbeat syncs
    const timeLeftRef = { current: initialTime };
    timerIntervalRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      setRemainingTime(timeLeftRef.current);

      if (timeLeftRef.current <= 0) {
        handleTimeExpired();
      }

      // Warning at 5 minutes
      if (timeLeftRef.current === 300) {
        setWarningMessage('Warning: 5 minutes remaining!');
        setTimeout(() => setWarningMessage(''), 5000);
      }

      // Warning at 1 minute
      if (timeLeftRef.current === 60) {
        setWarningMessage('Warning: 1 minute remaining! Your exam will auto-submit.');
        setTimeout(() => setWarningMessage(''), 5000);
      }
    }, 1000);

    // Heartbeat every 15 seconds to sync with server
    heartbeatIntervalRef.current = setInterval(async () => {
      const currentToken = sessionTokenRef.current;
      const currentFingerprint = fingerprintRef.current;
      if (!currentToken || !currentFingerprint) return;

      try {
        const response = await fetch(
          `${API_URL}/exam-engine/session/${currentToken}/heartbeat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-browser-fingerprint': currentFingerprint,
            },
          }
        );

        const data = await response.json();

        if (data.terminated) {
          handleTermination(data.reason);
          return;
        }

        // Sync time with server — update BOTH state and local ref
        if (data.remainingTime !== undefined) {
          timeLeftRef.current = data.remainingTime;
          setRemainingTime(data.remainingTime);
        }

        setViolationCount(data.violationCount ?? 0);
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 15000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // VIOLATION DETECTION
  useEffect(() => {
    if (!sessionToken || loading || submitted || terminated) return;

    // Tab visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportViolation('tab_switch', 'Tab became hidden');
      }
    };

    // Window blur (focus lost)
    const handleBlur = () => {
      windowFocusRef.current = false;
      reportViolation('window_blur', 'Window lost focus');
    };

    // Window focus
    const handleFocus = () => {
      windowFocusRef.current = true;
    };

    // Context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('right_click', 'Right-click attempted');
    };

    // Copy/Cut/Paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('copy_attempt', 'Copy attempted');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('cut_attempt', 'Cut attempted');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('paste_attempt', 'Paste attempted');
    };

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'p', 's', 'a', 'f', 'u'].includes(e.key.toLowerCase())) ||
        (e.altKey && e.key === 'Tab') ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        reportViolation('blocked_shortcut', `Blocked: ${e.ctrlKey ? 'Ctrl+' : ''}${e.altKey ? 'Alt+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
      }

      // Block Escape
      if (e.key === 'Escape') {
        e.preventDefault();
      }
    };

    // Block back/forward navigation
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      history.pushState(null, '', window.location.href);
      reportViolation('navigation_attempt', 'Back/Forward navigation attempted');
    };

    // Prevent page reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your exam is in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Push initial history state
    history.pushState(null, '', window.location.href);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionToken, loading, submitted, terminated]);

  // Report violation to server
  const reportViolation = async (type: string, details: string) => {
    if (!sessionToken) return;

    try {
      const response = await fetch(
        `${API_URL}/exam-engine/session/${sessionToken}/violation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-browser-fingerprint': fingerprintRef.current || fingerprint || '',
          },
          body: JSON.stringify({ type, details }),
        }
      );

      if (!response.ok) return;
      const data = await response.json();

      if (data.terminated) {
        handleTermination('Maximum violations exceeded');
      } else {
        setViolationCount(data.violationCount);
      }
    } catch (err) {
      console.error('Report violation error:', err);
    }
  };

  // Handle answer selection
  const handleAnswerChange = async (questionId: string, answer: Partial<Answer>) => {
    const newAnswer: Answer = {
      questionId,
      ...answer,
    };

    const newAnswers = new Map(answers);
    newAnswers.set(questionId, newAnswer);
    setAnswers(newAnswers);

    // Auto-save
    await saveAnswer(questionId, newAnswer);
  };

  // Save answer to server
  const saveAnswer = async (questionId: string, answer: Answer) => {
    if (!sessionToken) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/exam-engine/session/${sessionToken}/answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-browser-fingerprint': fingerprintRef.current || fingerprint || '',
          },
          body: JSON.stringify({
            questionId,
            selectedOption: answer.selectedOption,
            selectedOptions: answer.selectedOptions,
            textAnswer: answer.textAnswer,
          }),
        }
      );

      if (!response.ok) {
        console.error('Save answer failed:', response.status);
        setSaving(false);
        return;
      }
      const data = await response.json();

      if (data.terminated) {
        handleTermination(data.reason);
      } else {
        setLastSaved(new Date());
        setRemainingTime(data.remainingTime);
      }
    } catch (err) {
      console.error('Save answer error:', err);
    } finally {
      setSaving(false);
    }
  };

  // Submit exam
  const handleSubmit = async () => {
    if (submitted || terminated) return;

    const unanswered = questions.filter(q => getQuestionStatus(q.id) !== 'answered').length;
    
    if (unanswered > 0) {
      const confirmed = window.confirm(
        `You have ${unanswered} unanswered question(s). Are you sure you want to submit?`
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(
        `${API_URL}/exam-engine/session/${sessionToken}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-browser-fingerprint': fingerprintRef.current || fingerprint || '',
          },
        }
      );

      if (!response.ok) {
        setWarningMessage(`Submit failed (${response.status}). Please try again.`);
        setTimeout(() => setWarningMessage(''), 5000);
        return;
      }
      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        sessionStorage.removeItem(`exam_session_${examId}`);
        clearIntervals();
      }
    } catch (err) {
      console.error('Submit error:', err);
      setWarningMessage('Failed to submit. Please try again.');
      setTimeout(() => setWarningMessage(''), 5000);
    }
  };

  // Handle time expired
  const handleTimeExpired = async () => {
    clearIntervals();
    const currentToken = sessionTokenRef.current;
    const currentFingerprint = fingerprintRef.current;
    if (currentToken && currentFingerprint) {
      try {
        await fetch(
          `${API_URL}/exam-engine/session/${currentToken}/submit`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-browser-fingerprint': currentFingerprint,
            },
          }
        );
      } catch (err) {
        console.error('Auto-submit on timeout error:', err);
      }
    }
    setSubmitted(true);
    sessionStorage.removeItem(`exam_session_${examId}`);
  };

  // Handle termination
  const handleTermination = (reason: string) => {
    clearIntervals();
    setTerminated(true);
    setTerminationReason(reason);
    sessionStorage.removeItem(`exam_session_${examId}`);
  };

  // Clear intervals and cleanup media
  const clearIntervals = () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    cancelAnimationFrame(micAnimRef.current);
    audioCtxRef.current?.close();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  // Format time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get question status
  const getQuestionStatus = (questionId: string) => {
    const answer = answers.get(questionId);
    if (!answer) return 'unanswered';
    const hasAnswer = answer.selectedOption !== undefined || 
      (answer.selectedOptions && answer.selectedOptions.length > 0) ||
      !!answer.textAnswer ||
      (answer.matchAnswers && answer.matchAnswers.some(a => a)) ||
      (answer.orderAnswer && answer.orderAnswer.length > 0);
    return hasAnswer ? 'answered' : 'unanswered';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                const storedToken = sessionStorage.getItem(`exam_session_${examId}`);
                if (storedToken) {
                  loadExamSession(storedToken);
                } else {
                  router.push('/exam/login');
                }
              }}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/exam/login')}
              className="bg-blue-900 text-white px-6 py-2 rounded hover:bg-blue-800"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-green-500 text-6xl mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Submitted</h2>
          <p className="text-gray-600 mb-2">Your exam has been submitted successfully.</p>
          <p className="text-sm text-gray-500 mb-4">
            Questions Answered: {questions.filter(q => getQuestionStatus(q.id) === 'answered').length} / {totalQuestions}
          </p>
          <button
            onClick={() => router.push('/my/results')}
            className="bg-blue-900 text-white px-6 py-2 rounded hover:bg-blue-800"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // Terminated state
  if (terminated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Terminated</h2>
          <p className="text-gray-600 mb-4">{terminationReason}</p>
          <p className="text-sm text-gray-500 mb-4">
            Your responses have been saved. Contact your instructor if you believe this was an error.
          </p>
          <button
            onClick={() => router.push('/my/exams')}
            className="bg-blue-900 text-white px-6 py-2 rounded hover:bg-blue-800"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-100 select-none" style={{ userSelect: 'none' }}>
      {/* Fullscreen reminder */}
      {requireFullscreen && typeof document !== 'undefined' && !document.fullscreenElement && (
        <div
          className="fixed top-0 left-0 right-0 z-[60] bg-red-600 text-white text-center py-2 text-sm font-semibold cursor-pointer"
          onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}
        >
          ⚠ Fullscreen required — Click here to re-enter fullscreen
        </div>
      )}

      {/* Camera/Mic floating panel */}
      {(requireCamera || requireMicrophone) && (
        <div className="fixed top-16 right-4 z-50 bg-gray-900 rounded-lg shadow-xl overflow-hidden" style={{ width: 180 }}>
          {requireCamera && (
            <div className="relative">
              <div className="absolute top-1 left-1 z-10 flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                <span className={`inline-block w-2 h-2 rounded-full ${cameraStream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                {cameraStream ? 'LIVE' : 'OFF'}
              </div>
              {cameraError ? (
                <div className="w-full h-[135px] flex items-center justify-center bg-gray-800 text-red-400 text-xs p-2 text-center">{cameraError}</div>
              ) : (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-[135px] object-cover bg-black" />
              )}
            </div>
          )}
          {requireMicrophone && (
            <div className="p-2 bg-gray-800">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span className="text-[10px] text-gray-400">{micStream ? 'MIC ON' : 'MIC OFF'}</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${micLevel > 60 ? 'bg-red-500' : micLevel > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${micLevel}%` }}
                />
              </div>
              {micError && <p className="text-[10px] text-red-400 mt-1">{micError}</p>}
            </div>
          )}
        </div>
      )}

      {/* Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 bg-blue-900 text-white z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold truncate max-w-xs">{examTitle}</h1>
          </div>

          <div className="flex items-center space-x-6">
            {/* Proctoring indicators */}
            {(requireCamera || requireMicrophone) && (
              <div className="flex items-center space-x-2 text-xs">
                {requireCamera && (
                  <span className={`px-1.5 py-0.5 rounded ${cameraStream ? 'bg-green-600' : 'bg-red-600'}`}>
                    CAM {cameraStream ? 'ON' : 'OFF'}
                  </span>
                )}
                {requireMicrophone && (
                  <span className={`px-1.5 py-0.5 rounded ${micStream ? 'bg-green-600' : 'bg-red-600'}`}>
                    MIC {micStream ? 'ON' : 'OFF'}
                  </span>
                )}
              </div>
            )}

            {/* Timer */}
            <div className={`flex items-center space-x-2 ${remainingTime <= 300 ? 'text-red-300 animate-pulse' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono text-lg font-bold">{formatTime(remainingTime)}</span>
            </div>

            {/* Violation counter */}
            <div className={`flex items-center space-x-1 ${violationCount > 0 ? 'text-yellow-300' : ''}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm">{violationCount}/{maxViolations}</span>
            </div>

            {/* Progress */}
            <div className="text-sm">
              <span className="font-medium">{questions.filter(q => getQuestionStatus(q.id) === 'answered').length}</span>
              <span className="text-blue-200">/{totalQuestions} answered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Warning banner */}
      {warningMessage && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-black text-center py-2 font-semibold text-sm animate-pulse">
          {warningMessage}
        </div>
      )}

      {/* Main content */}
      <div className="pt-16 pb-20 flex">
        {/* Question navigation sidebar */}
        <aside className="fixed left-0 top-16 bottom-20 w-20 bg-white border-r overflow-y-auto">
          <div className="p-2">
            <p className="text-xs text-gray-500 text-center mb-2">Questions</p>
            <div className="grid grid-cols-3 gap-1">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-6 h-6 text-xs font-medium rounded ${
                    currentQuestion === index
                      ? 'bg-blue-900 text-white'
                      : getQuestionStatus(q.id) === 'answered'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Question area */}
        <main className="flex-1 ml-20 px-6 py-4">
          {currentQ && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                {/* Question header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <span className="text-sm font-medium text-gray-500">
                    Question {currentQuestion + 1} of {totalQuestions}
                  </span>
                  <span className="text-sm font-medium text-blue-900">
                    {currentQ.marks} mark{currentQ.marks > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Question text */}
                <div className="mb-6">
                  <p className="text-lg text-gray-900 whitespace-pre-wrap">{currentQ.text}</p>
                </div>

                {/* Answer options */}
                <div className="space-y-3">
                  {currentQ.type === 'mcq' && currentQ.options && (
                    <>
                      {currentQ.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            answers.get(currentQ.id)?.selectedOption === optIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQ.id}`}
                            checked={answers.get(currentQ.id)?.selectedOption === optIndex}
                            onChange={() => handleAnswerChange(currentQ.id, { selectedOption: optIndex })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="ml-3 text-gray-900">{option.text}</span>
                        </label>
                      ))}
                    </>
                  )}

                  {currentQ.type === 'mcq_multiple' && currentQ.options && (
                    <>
                      <p className="text-sm text-gray-500 mb-2">Select all correct answers:</p>
                      {currentQ.options.map((option, optIndex) => {
                        const currentSelected = answers.get(currentQ.id)?.selectedOptions || [];
                        const isChecked = currentSelected.includes(optIndex);
                        return (
                          <label
                            key={optIndex}
                            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              isChecked
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const newSelected = isChecked
                                  ? currentSelected.filter((i: number) => i !== optIndex)
                                  : [...currentSelected, optIndex];
                                handleAnswerChange(currentQ.id, { selectedOptions: newSelected, selectedOption: newSelected[0] });
                              }}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="ml-3 text-gray-900">{option.text}</span>
                          </label>
                        );
                      })}
                    </>
                  )}

                  {currentQ.type === 'true_false' && (
                    <div className="flex space-x-4">
                      {['True', 'False'].map((opt, optIndex) => (
                        <label
                          key={opt}
                          className={`flex-1 flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors ${
                            answers.get(currentQ.id)?.selectedOption === optIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQ.id}`}
                            checked={answers.get(currentQ.id)?.selectedOption === optIndex}
                            onChange={() => handleAnswerChange(currentQ.id, { selectedOption: optIndex })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="ml-2 text-gray-900 font-medium">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(currentQ.type === 'short_answer' || currentQ.type === 'numerical') && (
                    <>
                      {currentQ.imageUrl && (
                        <div className="mb-4 text-center">
                          <img src={currentQ.imageUrl} alt="Question" className="max-w-md max-h-64 rounded-lg border mx-auto" />
                        </div>
                      )}
                      <input
                        type={currentQ.type === 'numerical' ? 'number' : 'text'}
                        value={answers.get(currentQ.id)?.textAnswer || ''}
                        onChange={(e) => handleAnswerChange(currentQ.id, { textAnswer: e.target.value })}
                        className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={currentQ.type === 'numerical' ? 'Enter numerical answer' : 'Type your answer'}
                      />
                    </>
                  )}

                  {currentQ.type === 'essay' && (
                    <textarea
                      value={answers.get(currentQ.id)?.textAnswer || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, { textAnswer: e.target.value })}
                      rows={8}
                      className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder={currentQ.backendType === 'code' ? 'Write your code here...' : 'Write your answer here...'}
                      style={currentQ.backendType === 'code' ? { fontFamily: 'monospace' } : undefined}
                    />
                  )}

                  {currentQ.type === 'fill_blank' && (
                    <input
                      type="text"
                      value={answers.get(currentQ.id)?.textAnswer || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, { textAnswer: e.target.value })}
                      className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Fill in the blank..."
                    />
                  )}

                  {currentQ.type === 'image_based' && (
                    <>
                      {currentQ.imageUrl && (
                        <div className="mb-4 text-center">
                          <img src={currentQ.imageUrl} alt="Question" className="max-w-md max-h-64 rounded-lg border mx-auto" />
                        </div>
                      )}
                      {currentQ.options && currentQ.options.length > 0 ? (
                        currentQ.options.map((option, optIndex) => (
                          <label
                            key={optIndex}
                            className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                              answers.get(currentQ.id)?.selectedOption === optIndex
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}`}
                              checked={answers.get(currentQ.id)?.selectedOption === optIndex}
                              onChange={() => handleAnswerChange(currentQ.id, { selectedOption: optIndex })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="ml-3 text-gray-900">{option.text}</span>
                          </label>
                        ))
                      ) : (
                        <input
                          type="text"
                          value={answers.get(currentQ.id)?.textAnswer || ''}
                          onChange={(e) => handleAnswerChange(currentQ.id, { textAnswer: e.target.value })}
                          className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Type your answer based on the image..."
                        />
                      )}
                    </>
                  )}

                  {currentQ.type === 'code' && (
                    <div>
                      {currentQ.codeLanguage && (
                        <div className="mb-2 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded inline-block">
                          Language: {currentQ.codeLanguage}
                        </div>
                      )}
                      <textarea
                        value={answers.get(currentQ.id)?.textAnswer || ''}
                        onChange={(e) => handleAnswerChange(currentQ.id, { textAnswer: e.target.value })}
                        rows={12}
                        className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Write your code here..."
                        style={{ fontFamily: 'monospace', tabSize: 4 }}
                      />
                    </div>
                  )}

                  {currentQ.type === 'matching' && currentQ.matchPairs && (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">Match each item on the left with the correct item on the right:</p>
                      {currentQ.matchPairs.map((pair, pairIndex) => {
                        const currentMatchAnswers = answers.get(currentQ.id)?.matchAnswers || [];
                        const rightOptions = currentQ.matchRightOptions || currentQ.matchPairs!.map(p => p.right || '').filter(Boolean);
                        return (
                          <div key={pairIndex} className="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-900 flex-1">{pair.left}</span>
                            <span className="text-gray-400">→</span>
                            <select
                              title={`Match for ${pair.left}`}
                              value={currentMatchAnswers[pairIndex] || ''}
                              onChange={(e) => {
                                const newMatchAnswers = [...currentMatchAnswers];
                                while (newMatchAnswers.length <= pairIndex) newMatchAnswers.push('');
                                newMatchAnswers[pairIndex] = e.target.value;
                                handleAnswerChange(currentQ.id, { matchAnswers: newMatchAnswers, textAnswer: JSON.stringify(newMatchAnswers) });
                              }}
                              className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select match...</option>
                              {rightOptions.map((r, ri) => (
                                <option key={ri} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {currentQ.type === 'ordering' && currentQ.orderItems && (
                    <div>
                      <p className="text-sm text-gray-500 mb-3">Arrange items in the correct order (1 = first):</p>
                      {(() => {
                        const currentOrderAnswer = answers.get(currentQ.id)?.orderAnswer || currentQ.orderItems || [];
                        return currentOrderAnswer.map((item: string, itemIndex: number) => (
                          <div key={itemIndex} className="flex items-center gap-3 mb-2 p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm font-bold text-gray-400 w-6">{itemIndex + 1}.</span>
                            <select
                              title={`Order position ${itemIndex + 1}`}
                              value={item}
                              onChange={(e) => {
                                const newOrder = [...currentOrderAnswer];
                                const swapIndex = newOrder.indexOf(e.target.value);
                                if (swapIndex >= 0) {
                                  newOrder[swapIndex] = newOrder[itemIndex];
                                }
                                newOrder[itemIndex] = e.target.value;
                                handleAnswerChange(currentQ.id, { orderAnswer: newOrder, textAnswer: JSON.stringify(newOrder) });
                              }}
                              className="flex-1 p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                            >
                              {(currentQ.orderItems || []).map((opt: string, oi: number) => (
                                <option key={oi} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>

                {/* Clear answer button */}
                {answers.has(currentQ.id) && (
                  <button
                    onClick={() => {
                      const newAnswers = new Map(answers);
                      newAnswers.delete(currentQ.id);
                      setAnswers(newAnswers);
                    }}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear answer
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer - Fixed */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          {/* Submit button - only if manual submission is allowed */}
          {allowManualSubmission && (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Submit Exam
            </button>
          )}

          <button
            onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
            disabled={currentQuestion === questions.length - 1}
            className="px-6 py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </footer>
    </div>
  );
}
