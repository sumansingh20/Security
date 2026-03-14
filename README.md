<div align="center">

# 🛡️ Secure Examination Portal

### Enterprise-Grade Proctored Online Examination System

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-proctorexam.vercel.app-0070f3?style=for-the-badge&logo=vercel&logoColor=white)](https://proctorexam.vercel.app)
[![API Status](https://img.shields.io/badge/API-Online-00c853?style=for-the-badge&logo=express&logoColor=white)](https://security-api-new.vercel.app/api/health)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

<br>

A production-ready, full-stack proctored examination platform built for educational institutions.  
Features **real-time AI webcam monitoring**, **violation detection**, **batch scheduling**, and **comprehensive analytics** — deployed serverless on Vercel.

<br>

[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [📖 API Docs](#-api-reference) · [🐳 Docker](#-docker-deployment) · [🔐 Security](#-security-architecture)

---

</div>

<br>

## 📸 Quick Demo Access

| Role | Method | Credentials |
|:----:|:------:|:-----------:|
| **Admin** | Email + Password | `admin@proctoredexam.com` / `Admin@123` |
| **Teacher** | Email + Password | `teacher@proctoredexam.com` / `Teacher@123` |
| **Student** | Student ID + DOB | `STU001` / `01012000` |

> 💡 Demo accounts auto-reset. Student login uses Date of Birth in **DDMMYYYY** format.

<br>

## 🏗️ Tech Stack

<table>
<tr>
<td width="140"><b>Frontend</b></td>
<td>Next.js 16 (App Router) · TypeScript · Tailwind CSS · Zustand</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td>Node.js 20 · Express.js · MongoDB (Mongoose) · Redis</td>
</tr>
<tr>
<td><b>Auth</b></td>
<td>JWT in HttpOnly Cookies · DOB-based student login · Role-based access</td>
</tr>
<tr>
<td><b>Proctoring</b></td>
<td>WebRTC Camera/Mic · Browser Fingerprinting · Fullscreen Lock</td>
</tr>
<tr>
<td><b>Real-time</b></td>
<td>Socket.IO (self-hosted) · HTTP Polling (Vercel serverless)</td>
</tr>
<tr>
<td><b>DevOps</b></td>
<td>Vercel · Docker Compose · Nginx · MongoDB Atlas</td>
</tr>
</table>

<br>

## ✨ Features

### 🔒 Exam Security & Proctoring

| Feature | Description |
|:--------|:------------|
| **Live Webcam Feed** | Mandatory camera with floating video overlay during exam |
| **Microphone Monitoring** | Real-time audio level detection with visual indicator |
| **Fullscreen Enforcement** | Locks browser to fullscreen; exit triggers violation |
| **Tab Switch Detection** | Detects focus loss, alt-tab, window switching |
| **Clipboard Protection** | Blocks copy, paste, cut, right-click, keyboard shortcuts |
| **DevTools Detection** | Identifies browser developer tools being opened |
| **Fingerprint Binding** | Each session locked to browser fingerprint + IP address |
| **Auto-Termination** | Configurable violation threshold — auto-submits on breach |
| **Full Audit Trail** | Every action timestamped and logged for review |

### 🎓 Student Portal

- **Secure DOB Login** — Student ID + Date of Birth authentication
- **Exam Dashboard** — Upcoming, active, and completed exams at a glance
- **Smart Question Navigator** — Color-coded palette: answered ✅ · unanswered ⬜ · flagged 🚩 · visited 👁️
- **Auto-Save** — Answers saved every 30 seconds with server-synced timer
- **Built-in Calculator** — Available when enabled by teacher
- **Result Review** — Score breakdown with correct/wrong analysis

### 👨‍🏫 Teacher Portal

- **Exam Builder** — Duration, marks, passing %, negative marking, shuffling, proctoring toggles
- **Question Bank** — MCQ (single/multi), True/False, fill-blank, numerical, short/long answer, matching, ordering, code
- **Bulk Import** — CSV upload for questions and students
- **Category Tree** — Organize questions by subject/topic hierarchy
- **Live Monitor** — Real-time session dashboard with 5s auto-refresh
  - Student progress tracking · Violation alerts · Force submit / terminate controls
- **Analytics** — Pass rates, averages, score distribution, CSV export

### ⚙️ Admin Portal

Everything in Teacher Portal, plus:

- **User Management** — Create, edit, activate/deactivate, bulk CSV import, role assignment
- **System Settings** — Global configuration management
- **Audit Logs** — Complete system activity history with filters
- **Session Inspector** — View all active exam sessions across the platform
- **Reports Dashboard** — Violations, submissions, logins, security events, online users

<br>

## 📁 Project Structure

```
MoodleSecurity/
│
├── frontend/                         # Next.js 16 Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/                # Admin — dashboard, users, exams, monitor, reports, settings, logs
│   │   │   ├── teacher/              # Teacher — exams, questions, results, monitor, reports
│   │   │   ├── my/                   # Student — dashboard, exams, results
│   │   │   ├── exam/                 # Exam engine — DOB login, attempt interface
│   │   │   ├── login/                # Staff login
│   │   │   └── profile/              # User profile management
│   │   ├── components/               # Reusable UI — layouts, providers, quiz components
│   │   ├── lib/                      # API client (Axios), Socket.IO service
│   │   └── store/                    # Zustand stores — auth, exam state
│   ├── Dockerfile                    # Multi-stage production build
│   └── vercel.json                   # API proxy + security headers
│
├── backend/                          # Express.js API Server
│   ├── src/
│   │   ├── controllers/              # 9 controllers — auth, admin, student, exam, batch, etc.
│   │   ├── models/                   # 9 Mongoose schemas — User, Exam, Question, Session, etc.
│   │   ├── routes/                   # RESTful route definitions
│   │   ├── middleware/               # Auth · Validation · Security · Rate Limiting
│   │   ├── socket/                   # Socket.IO exam monitoring (self-hosted mode)
│   │   ├── config/                   # Database, Redis, app configuration
│   │   └── scripts/                  # Seed scripts for demo data
│   ├── api/index.js                  # Vercel serverless entry point
│   ├── Dockerfile                    # Node 20 Alpine production image
│   └── vercel.json                   # Serverless routing config
│
├── docker/                           # MongoDB init scripts
├── nginx/                            # Reverse proxy config
└── docker-compose.yml                # Full-stack orchestration
```

<br>

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ &nbsp;·&nbsp; **MongoDB** 6+ (or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)

### 1. Clone & Install

```bash
git clone https://github.com/sumansingh20/Security.git
cd Security
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/proctorexam
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-here
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-here
CORS_ORIGIN=http://localhost:3000
```

```bash
npm run dev
```

> ✅ Server starts on `http://localhost:5000` — demo users are auto-created on first boot.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
BACKEND_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=ProctoredExam
```

```bash
npm run dev
```

> ✅ App opens at `http://localhost:3000`

<br>

## ☁️ Vercel Deployment

### Backend

1. [vercel.com](https://vercel.com) → **New Project** → Import repo
2. **Root Directory** → `backend` &nbsp;·&nbsp; **Framework** → `Other`
3. Environment Variables:

| Variable | Value |
|:---------|:------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Strong random secret (32+ chars) |
| `JWT_REFRESH_SECRET` | Strong random secret (32+ chars) |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` |
| `FRONTEND_URL` | `https://your-frontend.vercel.app` |

### Frontend

1. **New Project** → Import same repo
2. **Root Directory** → `frontend` &nbsp;·&nbsp; **Framework** → `Next.js`
3. Environment Variables:

| Variable | Value |
|:---------|:------|
| `NEXT_PUBLIC_API_URL` | `/api` |
| `BACKEND_URL` | `https://your-backend.vercel.app/api` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://your-backend.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `ProctoredExam` |

> ⚠️ Socket.IO is unavailable on Vercel serverless — live monitoring uses HTTP polling (5s intervals) automatically.

<br>

## 🐳 Docker Deployment

```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker-compose up -d

# With Nginx reverse proxy (production)
docker-compose --profile production up -d
```

Create a `.env` file in the project root:

```env
MONGO_PASSWORD=your_secure_mongo_password
REDIS_PASSWORD=your_secure_redis_password
JWT_ACCESS_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
FRONTEND_URL=http://localhost:3000
```

| Service | Port | Description |
|:--------|:----:|:------------|
| MongoDB | 27017 | Database with persistent volume |
| Redis | 6379 | Session cache & rate limiting |
| Backend | 5000 | Express.js API with health checks |
| Frontend | 3000 | Next.js standalone server |
| Nginx | 80/443 | Reverse proxy (production profile) |

<br>

## 📖 API Reference

### Authentication

| Method | Endpoint | Description |
|:------:|:---------|:------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Staff login (email + password) |
| `POST` | `/api/auth/dob-login` | Student login (studentId + DOB) |
| `POST` | `/api/auth/logout` | Logout & clear session cookie |
| `GET` | `/api/auth/me` | Get authenticated user profile |
| `GET` | `/api/auth/session` | Check session validity |
| `POST` | `/api/auth/refresh-token` | Refresh access token |

### Admin — `/api/admin/*`

User CRUD · Exam management · Batch operations · Live monitoring · Results & grading · Reports (violations, submissions, logins, activity) · Categories · Questions · System settings · Audit logs

### Teacher — `/api/teacher/*`

Exam CRUD · Question bank · Bulk import · Batch scheduling · Live monitoring · Results & analytics · Violation tracking · Categories

### Student — `/api/student/*`

Available exams · Exam details · Start exam · Save answers · Submit · View results · Dashboard stats

### Exam Engine — `/api/exam-engine/*`

DOB session login · Load exam · Save answers · Report violations · Heartbeat sync · Submit exam · Device transfer

<br>

## 🔐 Security Architecture

| Layer | Implementation |
|:------|:---------------|
| **Authentication** | JWT in HttpOnly + Secure + SameSite cookies; session-token fallback for cross-origin |
| **Authorization** | Role-based access control (admin, teacher, student) on every route |
| **Input Sanitization** | express-mongo-sanitize (NoSQL injection) + XSS cleaning on all request data |
| **Rate Limiting** | Login: 20 req/15min · API: 100 req/min · Exam auto-save: 10 req/sec |
| **Validation** | Joi schemas on all backend endpoints |
| **CORS** | Whitelisted origins only; dynamic preview URL support |
| **Headers** | Helmet.js — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| **Session Binding** | Browser fingerprint + IP address locked per exam session |
| **Violation Engine** | Tracks 17 violation types with severity levels; auto-terminates on threshold |
| **Audit Trail** | Every significant action logged with user, IP, timestamp, and details |

<br>

## 🗄️ Database Schema

| Model | Records | Purpose |
|:------|:-------:|:--------|
| **User** | — | Students, teachers, admins with roles, DOB, studentId, session binding |
| **Exam** | — | Configuration: duration, marks, proctoring, batching, negative marking |
| **Question** | — | 14 types: MCQ, true/false, fill-blank, numerical, short/long answer, matching, ordering, code, image-based |
| **ExamSession** | — | Active session: token, IP, fingerprint, answers, violations, timing |
| **Submission** | — | Completed attempt: answers, scores, grading status |
| **ExamBatch** | — | Batch scheduling with roll ranges and staggered start times |
| **Violation** | — | Security events: type, severity, metadata, action taken |
| **Category** | — | Question bank tree structure for subjects and topics |
| **AuditLog** | — | System-wide activity logging with 25+ action types |

<br>

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

<br>

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br>

<div align="center">

---

**Built with ❤️ for Secure Education**

[⬆ Back to Top](#️-secure-examination-portal)

</div>
