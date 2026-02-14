'use client';

import { useEffect, useCallback, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/store/examStore';
import { AlertTriangle, ShieldAlert, Maximize, X } from 'lucide-react';
import { Button, Modal } from '@/components/ui';

interface QuizAttemptLayoutProps {
  children: ReactNode;
  examTitle: string;
  attemptId: string;
}

export default function QuizAttemptLayout({
  children,
  examTitle,
  attemptId,
}: QuizAttemptLayoutProps) {
  const router = useRouter();
  const {
    currentAttempt,
    recordViolation,
    showViolationWarning,
    dismissViolationWarning,
    autoSubmit,
  } = useExamStore();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);

  // Violation detection - Tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [recordViolation]);

  // Violation detection - Window blur
  useEffect(() => {
    const handleBlur = () => {
      recordViolation('window_blur');
    };

    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [recordViolation]);

  // Block right-click context menu
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('right_click');
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [recordViolation]);

  // Block copy/paste/cut
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('copy_attempt');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('paste_attempt');
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('cut_attempt');
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, [recordViolation]);

  // Block keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+A, F12, etc.
      if (
        (e.ctrlKey && ['c', 'v', 'a', 'u', 's', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        recordViolation('keyboard_shortcut');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [recordViolation]);

  // DevTools detection
  useEffect(() => {
    let devToolsOpen = false;
    const threshold = 160;

    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      
      if ((widthDiff || heightDiff) && !devToolsOpen) {
        devToolsOpen = true;
        recordViolation('devtools_open');
      } else if (!widthDiff && !heightDiff) {
        devToolsOpen = false;
      }
    };

    const interval = setInterval(checkDevTools, 1000);
    return () => clearInterval(interval);
  }, [recordViolation]);

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error('Fullscreen not supported:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error('Exit fullscreen error:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        recordViolation('fullscreen_exit');
        setShowExitWarning(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreen, recordViolation]);

  // Prevent page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have an exam in progress. Are you sure you want to leave?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Request fullscreen on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      enterFullscreen();
    }, 500);
    return () => clearTimeout(timer);
  }, [enterFullscreen]);

  // Calculate violation severity
  const violationCount = currentAttempt?.violationCount || 0;
  const maxViolations = 5;
  const violationPercentage = (violationCount / maxViolations) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 exam-mode">
      {/* Violation Warning Modal */}
      <Modal
        isOpen={showViolationWarning}
        onClose={dismissViolationWarning}
        title=""
        size="md"
      >
        <div className="text-center py-4">
          {/* Warning Icon with Pulse Animation */}
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 animate-pulse-soft">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Activity Warning
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your action has been logged as a potential violation. 
            Please focus on your exam to avoid automatic submission.
          </p>

          {/* Violation Progress Bar */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600 dark:text-gray-400">Violations</span>
              <span className={`font-semibold ${
                violationCount >= 4 ? 'text-red-600' : 
                violationCount >= 2 ? 'text-amber-600' : 'text-gray-900 dark:text-white'
              }`}>
                {violationCount} / {maxViolations}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  violationPercentage >= 80 ? 'bg-red-500' :
                  violationPercentage >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${violationPercentage}%` }}
              />
            </div>
            {violationCount >= 4 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                ⚠️ One more violation will auto-submit your exam
              </p>
            )}
          </div>

          <Button onClick={dismissViolationWarning} className="w-full">
            I Understand, Continue Exam
          </Button>
        </div>
      </Modal>

      {/* Fullscreen Exit Warning */}
      <Modal
        isOpen={showExitWarning}
        onClose={() => {}}
        title=""
        size="md"
      >
        <div className="text-center py-4">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <Maximize className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Fullscreen Required
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You have exited fullscreen mode. This has been recorded as a violation.
            Please return to fullscreen to continue your exam.
          </p>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setShowExitWarning(false);
                autoSubmit('Refused to return to fullscreen');
              }}
            >
              Submit & Exit
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowExitWarning(false);
                enterFullscreen();
              }}
            >
              Return to Fullscreen
            </Button>
          </div>
        </div>
      </Modal>

      {/* Main Content */}
      {children}
    </div>
  );
}
