# ProctoredExam - Deployment Guide

## Quick Start

### 1. GitHub Upload (One Command)
```powershell
cd d:\porcetord
.\upload-to-github.ps1
```

### 2. Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend-url/api
   NEXT_PUBLIC_APP_NAME = ProctoredExam
   ```

6. Click Deploy

### 3. Backend Deployment (Render/Railway/VPS)

#### Option A: Render.com (Recommended)
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node

5. Add environment variables:
   ```
   NODE_ENV = production
   PORT = 5000
   MONGODB_URI = mongodb+srv://...
   JWT_SECRET = your-secret-key-min-32-chars
   JWT_EXPIRES_IN = 7d
   CORS_ORIGIN = https://your-vercel-frontend.vercel.app
   ```

#### Option B: Railway.app
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select repository, set root to `backend`
4. Add MongoDB and Redis from Railway marketplace
5. Set environment variables

#### Option C: VPS (DigitalOcean/AWS/Azure)
```bash
# SSH to server
ssh user@your-server

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repo
git clone https://github.com/sumansingh20/MoodleSecurity.git
cd MoodleSecurity/backend

# Install dependencies
npm install

# Setup PM2
npm install -g pm2
pm2 start src/app.js --name exam-backend

# Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/exam-api
```

### 4. Database Setup (MongoDB Atlas)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create Free Cluster
3. Create Database User
4. Whitelist IP: 0.0.0.0/0 (for cloud deployment)
5. Get connection string and add to backend env

### 5. Post-Deployment

1. Update frontend `NEXT_PUBLIC_API_URL` with actual backend URL
2. Update backend `CORS_ORIGIN` with actual frontend URL
3. Create admin user:
   ```bash
   cd backend
   node src/scripts/create-admin.js
   ```

### 6. Troubleshooting

#### CSS Not Loading
- Check that `globals.css` is imported in `frontend/src/app/layout.tsx`
- Ensure the build completes without errors: `npm run build`
- Check browser console for CSS loading errors

#### Teacher Login Issues
- Use "Staff Login" tab on login page
- Enter email and password (not DOB login)
- Ensure teacher user exists in database with role: 'teacher'

#### API Connection Errors
- Verify `NEXT_PUBLIC_API_URL` is set correctly (must include `/api`)
- Check backend is running and accessible
- Verify CORS_ORIGIN includes the frontend URL
- Check backend logs for errors

#### Admin User Creation
```bash
# Navigate to backend directory
cd backend

# Create admin user (follow prompts)
node src/scripts/create-admin.js

# Create test teacher
node src/scripts/create-user.js
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                     │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Next.js App (Static + Server Components)           ││
│  │  - Login Page                                       ││
│  │  - Admin Dashboard                                  ││
│  │  - Student Portal                                   ││
│  │  - Teacher Panel                                    ││
│  └──────────────────────────┬──────────────────────────┘│
└─────────────────────────────┼───────────────────────────┘
                              │ API Calls
                              ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND SERVER (Render/VPS)                │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Express.js API                                     ││
│  │  - Authentication (JWT + DOB)                       ││
│  │  - Exam Engine (Batch Controller)                   ││
│  │  - Session Management                               ││
│  │  - Timer Control (Server-side)                      ││
│  │  - Violation Detection                              ││
│  └──────────────────────────┬──────────────────────────┘│
└─────────────────────────────┼───────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                 MongoDB Atlas (Database)                 │
│  - Users, Exams, Questions, Submissions, Violations     │
│  - Audit Logs (Immutable)                               │
└─────────────────────────────────────────────────────────┘
```

## Security Notes

- All exam logic runs on backend (NOT on Vercel)
- JWT tokens expire in 7 days
- Student passwords = Date of Birth (DDMMYYYY)
- Session bound to IP + Browser fingerprint
- One device per student during exam
- All violations logged immutably

## User Roles

| Role    | Login Method         | Access                          |
|---------|---------------------|----------------------------------|
| Admin   | Email + Password    | Full system access               |
| Teacher | Email + Password    | Exam management, monitoring      |
| Student | Student ID + DOB    | Take exams, view results         |

## Support

For issues, open a GitHub issue or contact: support@proctoredexam.com
