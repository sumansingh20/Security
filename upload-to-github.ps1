# ProctoredExam - GitHub Upload Script
# Run: .\upload-to-github.ps1

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  PROCTORED EXAM - GITHUB UPLOAD" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Remove git lock if exists
if (Test-Path ".git\index.lock") {
    Write-Host "`n[CLEANUP] Removing git lock file..." -ForegroundColor Yellow
    Remove-Item ".git\index.lock" -Force
}

# Check git status
Write-Host "`n[STATUS] Checking repository status..." -ForegroundColor Yellow
git status --short

# Stage all changes
Write-Host "`n[STAGE] Staging all changes..." -ForegroundColor Yellow
git add -A

# Get current date for commit message
$date = Get-Date -Format "yyyy-MM-dd HH:mm"

# Commit with detailed message
Write-Host "`n[COMMIT] Creating commit..." -ForegroundColor Yellow
git commit -m "ProctoredExam - Secure Exam Portal [$date]

FRONTEND (Next.js - Deploy to Vercel):
- 52+ pages compiled successfully
- Admin: Dashboard, Users, Exams, Questions, Monitor, Logs, Settings
- Teacher: Dashboard, Courses, Batch Controller, Monitor
- Student: Dashboard, Exams, Results
- DOB-based login (DDMMYYYY format)
- Server time synchronization
- Exam lockdown (tab switch, blur, right-click prevention)

BACKEND (Express - Deploy to Render/VPS):
- Authentication (JWT + DOB login)
- Exam lifecycle (DRAFT -> PUBLISHED -> ONGOING -> COMPLETED -> ARCHIVED)
- Batch controller (max 500 students per batch)
- Live monitoring with force submit/terminate
- Violation logging
- Audit logs (immutable)
- System settings

SECURITY:
- Session binding (IP + browser fingerprint)
- One device per student
- Server-side timer control
- Auto-submit on timeout/violation

Ready for production deployment."

# Push to GitHub
Write-Host "`n[PUSH] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "  UPLOAD COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Repository: https://github.com/sumansingh20/MoodleSecurity" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Deploy Frontend to Vercel:" -ForegroundColor White
Write-Host "   - Go to vercel.com" -ForegroundColor Gray
Write-Host "   - Import GitHub repo" -ForegroundColor Gray
Write-Host "   - Set root directory: frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Deploy Backend to Render/Railway:" -ForegroundColor White
Write-Host "   - Go to render.com or railway.app" -ForegroundColor Gray
Write-Host "   - Import GitHub repo" -ForegroundColor Gray
Write-Host "   - Set root directory: backend" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Setup MongoDB Atlas:" -ForegroundColor White
Write-Host "   - Go to cloud.mongodb.com" -ForegroundColor Gray
Write-Host "   - Create free cluster" -ForegroundColor Gray
Write-Host ""
Write-Host "See DEPLOY.md for detailed instructions." -ForegroundColor Yellow
Write-Host ""
