import { useEffect, useState } from 'react';
import { useExamStore } from '../store/examStore';
import { submitViolation } from '../lib/api';

export const useAntiCheat = (examId: string) => {
  const [violationCount, setViolationCount] = useState(0);
  const { autoSubmit } = useExamStore();

  useEffect(() => {
    // 1. Tab Switch / Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('tab_switch', 'User switched tabs or minimized the window.');
      }
    };

    // 2. Window Blur (Lost Focus)
    const handleBlur = () => {
      handleViolation('window_blur', 'Window lost focus.');
    };

    // 3. Prevent Copy/Paste/Context Menu
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handlePaste = (e: ClipboardEvent) => e.preventDefault();

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);

    return () => {
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [examId]);

  const handleViolation = async (type: string, description: string) => {
    const nextViolationCount = violationCount + 1;
    setViolationCount(nextViolationCount);
    
    try {
      await submitViolation(examId, { type, description });
      
      // Auto-submit or terminate if violations exceed limit
      if (nextViolationCount >= 3) {
        await autoSubmit('Exam terminated due to multiple violations.');
        alert('Exam terminated due to multiple violations.');
        // Navigate or auto-submit logic here
      } else {
        alert(`Warning: ${description}. Proceeding will result in termination.`);
      }
    } catch (error) {
      console.error('Failed to log violation', error);
    }
  };

  return { violationCount };
};
