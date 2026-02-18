# Secure Examination Portal

A full-stack proctored online examination system built for educational institutions. Supports real-time exam monitoring, violation detection, batch management, and comprehensive result analytics.

## Live Demo

- **Frontend:** https://proctoredexam.vercel.app
- **Backend API:** https://security-api-new.vercel.app

### Demo Credentials

| Role | Login Method | Credentials |
|------|-------------|-------------|
| Admin | Email + Password | `admin@proctorexam.com` / `Admin@123` |
| Teacher | Email + Password | `teacher@proctorexam.com` / `Teacher@123` |
| Student | Student ID + DOB | `STU001` / `01012000` |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js, Express.js, MongoDB (Mongoose), JWT (HttpOnly Cookies) |
| Real-time | HTTP Polling (Vercel compatible), Socket.IO (local dev) |
| Deployment | Vercel (serverless, both frontend and backend) |
| Validation | Joi (backend), Zod-style client validation |

## Features

### Exam Security & Proctoring
- Webcam and microphone monitoring during exams
- Tab switch, window blur, and focus loss detection
- Copy/paste, right-click, and keyboard shortcut prevention
- Fullscreen enforcement with exit detection
- DevTools open detection
- Configurable violation thresholds with auto-termination
- IP address and browser fingerprint binding per session
- Full audit trail of all security events

### Student Portal
- DOB-based secure login (Student ID + Date of Birth in DDMMYYYY format)
- Dashboard with upcoming, active, and completed exams
- Proctored exam interface with:
  - Question navigation palette (answered, unanswered, flagged, visited)
  - Auto-save every 30 seconds
  - Built-in calculator (when enabled by teacher)
  - Timer with server-time synchronization
  - Violation warning popups
- Post-exam confirmation and result viewing
- Result details with score breakdown

### Teacher Portal
- Create and manage exams with configurable settings:
  - Duration, total marks, passing percentage
  - Negative marking, question shuffling, option shuffling
  - Proctoring options (camera, microphone, fullscreen)
  - Calculator permission
  - Batch management for large groups
- Question bank with MCQ (single/multiple), True/False types
- Bulk question import
- Category-based question organization
- Live exam monitoring dashboard (HTTP polling, 5s refresh)
  - Active student tracking with progress indicators
  - Violation alerts and counts
  - Force submit / terminate session controls
- Exam results with analytics (averages, pass rates, score distribution)
- Export results to CSV

### Admin Portal
- Full user management (create, edit, activate/deactivate, delete)
  - Single user creation wizard
  - Bulk CSV import for students
  - Role-based access (admin, teacher, student)
- All teacher capabilities plus:
  - System-wide settings management
  - Audit log viewer
  - Session inspector for all active exams
  - Global violation and submission reports
  - User activity and login tracking reports

## Project Structure

```
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   │   ├── admin/           # Admin panel (dashboard, users, exams, monitor, reports, settings)
│   │   │   ├── teacher/         # Teacher panel (exams, questions, results, monitor)
│   │   │   ├── my/              # Student portal (dashboard, exams, results)
│   │   │   ├── exam/            # Exam session pages (DOB login flow)
│   │   │   ├── login/           # Staff login
│   │   │   └── profile/         # User profile
│   │   ├── components/          # Reusable components
│   │   │   ├── layouts/         # LMSLayout, SidebarLayout
│   │   │   ├── providers/       # Auth, Toast providers
│   │   │   └── ui/              # UI primitives
│   │   ├── lib/                 # API client, Socket service
│   │   └── store/               # Zustand stores (auth, exam)
│   └── vercel.json              # Frontend deployment config
├── backend/                     # Express.js API server
│   ├── src/
│   │   ├── controllers/         # Route handlers (9 controllers)
│   │   ├── models/              # Mongoose schemas (9 models)
│   │   ├── routes/              # API route definitions
│   │   ├── middleware/          # Auth, validation, security (rate limiting)
│   │   ├── socket/              # WebSocket handlers (local dev only)
│   │   ├── scripts/             # Seed scripts
│   │   └── config/              # Database, Redis, app config
│   ├── api/index.js             # Vercel serverless entry point
│   └── vercel.json              # Backend deployment config
└── docker/                      # Docker setup (optional)
```

## Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local installation or MongoDB Atlas free tier)

### Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/proctorexam
JWT_SECRET=your-secret-key-minimum-32-chars
JWT_EXPIRES_IN=24h
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

```bash
npm run dev    # Starts on http://localhost:5000
```

The server auto-creates demo admin, teacher, and student accounts on first run.

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=ProctoredExam
```

```bash
npm run dev    # Starts on http://localhost:3000
```

## Deployment to Vercel

### Backend Deployment
1. Go to [vercel.com](https://vercel.com) → New Project
2. Import the repository
3. Set **Root Directory** to `backend`
4. Set **Framework Preset** to "Other"
5. Add environment variables:
   - `MONGODB_URI` — Your MongoDB Atlas connection string
   - `JWT_SECRET` — Strong random secret (32+ characters)
   - `NODE_ENV` — `production`
   - `CORS_ORIGIN` — Your frontend URL (e.g., `https://proctoredexam.vercel.app`)
6. Deploy

### Frontend Deployment
1. New Project → Import same repository
2. Set **Root Directory** to `frontend`
3. Set **Framework Preset** to "Next.js"
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` — `/api`
   - `NEXT_PUBLIC_BACKEND_URL` — `https://your-backend.vercel.app/api`
   - `NEXT_PUBLIC_WS_URL` — `https://your-backend.vercel.app`
   - `NEXT_PUBLIC_APP_NAME` — `ProctoredExam`
5. Deploy

> **Note:** WebSocket-based real-time features are not available on Vercel serverless. The application uses HTTP polling for live exam monitoring in production.

## API Routes Overview

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Staff login (email + password) |
| POST | `/api/auth/dob-login` | Student login (studentId + DOB) |
| POST | `/api/auth/logout` | Logout (clears session cookie) |
| GET | `/api/auth/me` | Get authenticated user profile |
| GET | `/api/auth/session` | Check session validity |

### Admin Routes (`/api/admin/*`)
User CRUD, exam management, batch operations, monitoring, results, reports, violations, categories, questions, system settings, audit logs.

### Teacher Routes (`/api/teacher/*`)
Exam CRUD, question management, batch operations, live monitoring, results, violations, categories.

### Student Routes (`/api/student/*`)
Available exams, exam details, start exam, save answers, submit exam, view results.

### Exam Engine Routes (`/api/exam-engine/*`)
DOB-based session login, exam state management, answer submission, violation reporting.

## Security Measures

- JWT tokens stored in HttpOnly, Secure, SameSite cookies (not accessible via JavaScript)
- Session-based token fallback for cross-origin requests
- Rate limiting on login (5 attempts/15min), API (100 req/15min), and exam endpoints
- Input validation with Joi schemas on all endpoints
- CORS restricted to specific origins
- Mongoose query sanitization
- XSS protection headers
- Browser fingerprint verification per exam session
- Automatic session invalidation on suspicious activity

## Database Models

| Model | Purpose |
|-------|---------|
| User | Students, teachers, admins with role-based access |
| Exam | Exam configuration, scheduling, proctoring settings |
| Question | MCQ questions with options, marks, explanations |
| Submission | Student exam attempts with answers and scores |
| ExamSession | Active exam session tracking (IP, fingerprint, timing) |
| ExamBatch | Batch scheduling for large-scale exams |
| Violation | Security violation records with severity levels |
| Category | Question bank categories and subjects |
| AuditLog | System-wide activity logging |

## License

MIT
