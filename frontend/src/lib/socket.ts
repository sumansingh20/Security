import { io, Socket } from 'socket.io-client';

class SocketService {
  private examSocket: Socket | null = null;
  private monitorSocket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Connect to exam-session namespace (student taking exam)
  connectExamSession(sessionToken: string, fingerprint: string) {
    if (typeof window === 'undefined') return;
    if (this.examSocket?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    this.examSocket = io(`${socketUrl}/exam-session`, {
      auth: { sessionToken, fingerprint },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupExamListeners();
  }

  // Connect to exam-monitor namespace (teacher/admin monitoring)
  connectMonitor(token: string) {
    if (typeof window === 'undefined') return;
    if (this.monitorSocket?.connected) return;

    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    this.monitorSocket = io(`${socketUrl}/exam-monitor`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.setupMonitorListeners();
  }

  // Legacy connect method (backwards compatible)
  connect(token: string) {
    this.connectMonitor(token);
  }

  private setupExamListeners() {
    if (!this.examSocket) return;

    this.examSocket.on('connect', () => {
      console.log('[Exam Socket] Connected');
      this.reconnectAttempts = 0;
    });

    this.examSocket.on('disconnect', (reason) => {
      console.log('[Exam Socket] Disconnected:', reason);
    });

    this.examSocket.on('connect_error', (error) => {
      console.error('[Exam Socket] Connection error:', error.message);
      this.reconnectAttempts++;
    });

    // Session joined confirmation
    this.examSocket.on('session-joined', (data) => {
      console.log('[Exam Socket] Session joined:', data);
    });

    // Answer saved confirmation
    this.examSocket.on('answer-saved', (data) => {
      console.log('[Exam Socket] Answer saved:', data);
    });

    this.examSocket.on('save-failed', (data) => {
      console.error('[Exam Socket] Save failed:', data.reason);
    });

    // Violation recorded
    this.examSocket.on('violation-recorded', (data) => {
      console.log('[Exam Socket] Violation recorded:', data);
    });

    // Time expired
    this.examSocket.on('time-expired', async () => {
      try {
        const { useExamStore } = await import('@/store/examStore');
        useExamStore.getState().autoSubmit('time_expired');
      } catch (e) {
        console.error('Failed to handle time expiry:', e);
      }
    });

    // Force submit by admin
    this.examSocket.on('force-submit', async (data) => {
      try {
        const { useExamStore } = await import('@/store/examStore');
        useExamStore.getState().autoSubmit(data.reason || 'admin_force_submit');
      } catch (e) {
        console.error('Failed to handle force submit:', e);
      }
    });

    // Session terminated
    this.examSocket.on('session-terminated', async (data) => {
      console.error('[Exam Socket] Session terminated:', data.reason);
      if (typeof window !== 'undefined') {
        alert(data.reason || 'Your session has been terminated.');
        window.location.href = '/';
      }
    });

    // Exam submitted confirmation
    this.examSocket.on('exam-submitted', (data) => {
      console.log('[Exam Socket] Exam submitted:', data);
    });

    // Admin broadcast message
    this.examSocket.on('admin-message', (data) => {
      if (typeof window !== 'undefined') {
        alert(`Message from examiner: ${data.message}`);
      }
    });

    // Heartbeat response
    this.examSocket.on('heartbeat-response', async (data) => {
      try {
        const { useExamStore } = await import('@/store/examStore');
        useExamStore.getState().syncTimer(data.remainingTime);
      } catch (e) {
        // Timer sync from heartbeat
      }
    });

    this.examSocket.on('error', (data) => {
      console.error('[Exam Socket] Error:', data.message, data.code);
    });
  }

  private setupMonitorListeners() {
    if (!this.monitorSocket) return;

    this.monitorSocket.on('connect', () => {
      console.log('[Monitor Socket] Connected');
    });

    this.monitorSocket.on('disconnect', (reason) => {
      console.log('[Monitor Socket] Disconnected:', reason);
    });

    this.monitorSocket.on('connect_error', (error) => {
      console.error('[Monitor Socket] Connection error:', error.message);
    });

    // Exam stats update
    this.monitorSocket.on('exam-stats', (data) => {
      console.log('[Monitor Socket] Exam stats:', data);
    });

    // Student events
    this.monitorSocket.on('student-joined', (data) => {
      console.log('[Monitor] Student joined:', data);
    });

    this.monitorSocket.on('student-submitted', (data) => {
      console.log('[Monitor] Student submitted:', data);
    });

    this.monitorSocket.on('student-disconnected', (data) => {
      console.log('[Monitor] Student disconnected:', data);
    });

    this.monitorSocket.on('violation-alert', (data) => {
      console.log('[Monitor] Violation alert:', data);
    });

    this.monitorSocket.on('error', (data) => {
      console.error('[Monitor Socket] Error:', data.message);
    });
  }

  disconnect() {
    if (this.examSocket) {
      this.examSocket.disconnect();
      this.examSocket = null;
    }
    if (this.monitorSocket) {
      this.monitorSocket.disconnect();
      this.monitorSocket = null;
    }
  }

  disconnectExam() {
    if (this.examSocket) {
      this.examSocket.disconnect();
      this.examSocket = null;
    }
  }

  disconnectMonitor() {
    if (this.monitorSocket) {
      this.monitorSocket.disconnect();
      this.monitorSocket = null;
    }
  }

  // ========== EXAM SESSION METHODS ==========

  // Join exam session room (student)
  joinExamRoom(sessionToken: string, fingerprint: string) {
    this.examSocket?.emit('join-exam', { sessionToken, fingerprint });
  }

  // Save answer via socket (real-time sync)
  saveAnswer(questionId: string, answer: any) {
    this.examSocket?.emit('save-answer', { questionId, answer });
  }

  // Report violation
  reportViolation(type: string, details?: string) {
    this.examSocket?.emit('violation', { type, details });
  }

  // Submit exam via socket
  submitExam() {
    this.examSocket?.emit('submit-exam');
  }

  // Send heartbeat
  sendHeartbeat() {
    this.examSocket?.emit('heartbeat');
  }

  // ========== MONITOR METHODS ==========

  // Join exam monitor room (teacher/admin)
  joinMonitorRoom(examId: string, token: string) {
    this.monitorSocket?.emit('join-exam-monitor', { examId, token });
  }

  // Request stats refresh
  requestStats() {
    this.monitorSocket?.emit('request-stats');
  }

  // Force submit a student
  forceSubmitStudent(sessionToken: string, reason: string) {
    this.monitorSocket?.emit('force-submit-student', { sessionToken, reason });
  }

  // Terminate a session
  terminateSession(sessionToken: string, reason: string) {
    this.monitorSocket?.emit('terminate-session', { sessionToken, reason });
  }

  // Broadcast message to all students
  broadcastMessage(message: string) {
    this.monitorSocket?.emit('broadcast-message', { message });
  }

  // ========== EVENT LISTENERS ==========

  onTimerUpdate(callback: (timeRemaining: number) => void) {
    this.examSocket?.on('heartbeat-response', (data) => callback(data.remainingTime));
  }

  onAutoSubmit(callback: (reason: string) => void) {
    this.examSocket?.on('force-submit', (data) => callback(data.reason));
    this.examSocket?.on('time-expired', () => callback('time_expired'));
  }

  onExamSubmitted(callback: (data: any) => void) {
    this.examSocket?.on('exam-submitted', callback);
  }

  onSessionJoined(callback: (data: any) => void) {
    this.examSocket?.on('session-joined', callback);
  }

  onAnswerSaved(callback: (data: any) => void) {
    this.examSocket?.on('answer-saved', callback);
  }

  onViolationRecorded(callback: (data: any) => void) {
    this.examSocket?.on('violation-recorded', callback);
  }

  // Monitor listeners
  onExamStats(callback: (data: any) => void) {
    this.monitorSocket?.on('exam-stats', callback);
  }

  onStudentJoined(callback: (data: any) => void) {
    this.monitorSocket?.on('student-joined', callback);
  }

  onStudentSubmitted(callback: (data: any) => void) {
    this.monitorSocket?.on('student-submitted', callback);
  }

  onStudentDisconnected(callback: (data: any) => void) {
    this.monitorSocket?.on('student-disconnected', callback);
  }

  onViolationAlert(callback: (data: any) => void) {
    this.monitorSocket?.on('violation-alert', callback);
  }

  onStateSync(callback: (state: any) => void) {
    this.examSocket?.on('session-joined', callback);
  }

  // Remove event listener
  off(event: string) {
    this.examSocket?.off(event);
    this.monitorSocket?.off(event);
  }

  // Check connection status
  isConnected(): boolean {
    return this.examSocket?.connected ?? this.monitorSocket?.connected ?? false;
  }

  isExamConnected(): boolean {
    return this.examSocket?.connected ?? false;
  }

  isMonitorConnected(): boolean {
    return this.monitorSocket?.connected ?? false;
  }
}

export const socketService = new SocketService();
