'use client';

import { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface QuizTimerProps {
  timeRemaining: number; // in seconds
  onTimeUp: () => void;
}

export default function QuizTimer({ timeRemaining: initialTime, onTimeUp }: QuizTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isWarning, setIsWarning] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  // Update from server sync
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0) {
      onTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        
        // Warning at 5 minutes
        if (newTime <= 300 && newTime > 60) {
          setIsWarning(true);
          setIsCritical(false);
        }
        // Critical at 1 minute
        else if (newTime <= 60) {
          setIsWarning(false);
          setIsCritical(true);
        }
        
        if (newTime <= 0) {
          onTimeUp();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onTimeUp, timeRemaining]);

  // Format time as HH:MM:SS or MM:SS
  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm font-semibold transition-all duration-300',
        isCritical && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 animate-pulse-soft shadow-md shadow-red-500/20',
        isWarning && !isCritical && 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
        !isWarning && !isCritical && 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
      )}
    >
      {isCritical ? (
        <AlertTriangle className="w-4 h-4 animate-bounce-soft" />
      ) : (
        <Clock className="w-4 h-4" />
      )}
      <span className="tabular-nums">{formatTime(timeRemaining)}</span>
      {isCritical && (
        <span className="text-xs font-normal">left</span>
      )}
    </div>
  );
}
