# 🚀 Automated Job Application Tracker

A system that automatically tracks job applications using a Chrome extension and backend service.

## 🔴 Problem
Job seekers apply across multiple platforms but lack a unified system to track applications, especially when confirmations are inconsistent or missing.

## 💡 Solution
- Chrome extension detects job application submission events
- Backend API stores applications in a database
- Supports dynamic SPA websites
- Secure backend communication via extension background worker

## 🏗️ Architecture
Browser Page
→ Content Script
→ Background Service Worker
→ Backend API
→ PostgreSQL
## 🛠️ Tech Stack
- Backend: Node.js, Express
- Database: PostgreSQL
- Automation: Chrome Extension (Manifest v3)
- Browser APIs: MutationObserver, runtime messaging

## ✅ Features Implemented
- Manual job entry API
- Automatic job detection on submission pages
- SPA-safe DOM mutation tracking
- Secure backend communication (CORS-safe)
- Persistent storage

## 🚧 Work in Progress
- Deduplication engine
- Application analytics
- Smart follow-ups
- Resume–JD matching (AI)

## ▶️ How to Run
```bash
cd backend
npm install
node app.js
Load extension:
	•	Open chrome://extensions
	•	Enable Developer Mode
	•	Load extension/ folder
    