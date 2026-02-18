import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    // Connect to /exam namespace (matching backend)
    this.socket = io(`${socketUrl}/exam`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    // Exam-related events (matching backend event names)
    this.socket.on('time-sync', (data) => {
      const { useExamStore } = require('@/store/examStore');
      useExamStore.getState().syncTimer(data.timeRemaining);
    });

    this.socket.on('exam-submitted', (data) => {
      const { useExamStore } = require('@/store/examStore');
      useExamStore.getState().autoSubmit(data.reason);
    });

    this.socket.on('answer-saved', (data) => {
      console.log('Answer saved:', data);
    });

    this.socket.on('violation-recorded', (data) => {
      console.log('Violation recorded:', data);
    });

    this.socket.on('session:invalidated', (data) => {
      // Another login detected - force logout
      const { useAuthStore } = require('@/store/authStore');
      useAuthStore.getState().logout();
      window.location.href = '/login?reason=session_invalidated';
    });

    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Exam room management (matching backend event names)
  joinExamRoom(submissionId: string) {
    this.socket?.emit('join-exam', { submissionId });
  }

  leaveExamRoom(submissionId: string) {
    this.socket?.emit('leave-exam', { submissionId });
  }

  // Save answer via socket (for real-time sync)
  saveAnswer(submissionId: string, questionId: string, answer: any) {
    this.socket?.emit('save-answer', {
      submissionId,
      questionId,
      selectedOptions: answer.selectedOptions,
      markedForReview: answer.markedForReview,
      timeTaken: answer.timeTaken,
    });
  }

  // Report violation
  reportViolation(submissionId: string, type: string, details?: any) {
    this.socket?.emit('violation', {
      submissionId,
      type,
      description: details?.description,
      questionNumber: details?.questionNumber,
      timestamp: new Date().toISOString(),
    });
  }

  // Request state sync (after reconnection)
  requestSync(submissionId: string) {
    this.socket?.emit('request-sync', { submissionId });
  }

  // Event listeners
  onTimerUpdate(callback: (timeRemaining: number) => void) {
    this.socket?.on('time-sync', (data) => callback(data.timeRemaining));
  }

  onAutoSubmit(callback: (reason: string) => void) {
    this.socket?.on('exam-submitted', (data) => callback(data.reason));
  }

  onStateSync(callback: (state: any) => void) {
    this.socket?.on('exam-state', callback);
  }

  // Remove event listener
  off(event: string) {
    this.socket?.off(event);
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
