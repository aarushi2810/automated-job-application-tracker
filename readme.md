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

## ▶️ How to Run
```bash
cd backend
npm install
node app.js
Load extension:
	•	Open chrome://extensions
	•	Enable Developer Mode
	•	Load extension/ folder

## 🧪 Demo & Usage

This project is designed as a portfolio-grade system.

To demo:
1. Backend can be run locally or via the deployed Render URL
2. Chrome extension auto-detects job application submissions
3. Applications are stored and analyzed via backend APIs
4. Resume–JD matching can be tested using the `/match` endpoints

External services (AI APIs, cloud databases) are optional and gracefully handled when unavailable.


## 🧪 Testing

The system can be tested via API endpoints using curl or Postman.

- `/health` — service health check
- `/analytics/*` — application insights
- `/match` — resume–JD matching (no DB required)

Browser automation can be tested locally by simulating submission messages on any webpage.

