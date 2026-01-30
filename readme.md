# 🚀 Automated Job Application Tracker

An end-to-end system that automatically tracks job applications using a Chrome extension, secure backend APIs, and PostgreSQL, designed to work reliably with modern SPA-based job portals.



## 🔴 Problem

Job seekers apply to dozens of roles across platforms like LinkedIn, company career pages, and job boards.
There is no unified system to:
	•	Automatically capture applications
	•	Track status updates (applied, interview, offer, rejected)
	•	Analyze application activity
	•	Secure personal application data

Manual spreadsheets don’t scale and miss automated submissions.



## 💡 Solution

This project provides:
	•	🔍 Automatic job application detection via a Chrome extension
	•	🔐 JWT-based authentication for secure access
	•	🗄️ PostgreSQL-backed storage
	•	📊 Analytics APIs for insights
	•	🔄 SPA-safe automation using DOM mutation tracking


## 🏗️ System Architecture

Browser Job Page
   ↓
Chrome Content Script
   ↓
Background Service Worker
   ↓
Secure Backend API (JWT)
   ↓
PostgreSQL Database




## 🛠️ Tech Stack

Backend
	•	Node.js
	•	Express.js
	•	PostgreSQL
	•	JWT (jsonwebtoken)
	•	bcrypt
	•	pg

Browser Automation
	•	Chrome Extension (Manifest V3)
	•	MutationObserver
	•	Chrome Runtime Messaging

Deployment
	•	Backend: Render
	•	Database: Neon (PostgreSQL)


🔐 Authentication & Security
	•	JWT-based login system
	•	Password hashing with bcrypt
	•	Protected routes using middleware
	•	User-scoped data access (users can only access their own applications)
	•	Secure backend communication from browser extension



## ✅ Features Implemented

Core
	•	User registration & login
	•	JWT token generation
	•	Protected API routes
	•	Application CRUD operations
	•	Status updates (applied, interview, rejected, offer)

Automation
	•	Detects job submission confirmation pages
	•	SPA-safe DOM mutation handling
	•	Duplicate submission prevention

Analytics
	•	Total applications count
	•	Platform-wise breakdown
	•	Follow-up detection based on application age


## 📡 API Endpoints (Sample)

Auth

POST /auth/register
POST /auth/login

Applications (JWT required)

POST   /applications
GET    /applications
PATCH  /applications/:id/status

Analytics

GET /analytics/total
GET /analytics/platforms




## ▶️ Run Locally

Backend

cd backend
npm install
npm start

Environment Variables (.env)

DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
JWT_SECRET=your_secret_key
NODE_ENV=development

Chrome Extension
	1.	Open chrome://extensions
	2.	Enable Developer Mode
	3.	Click Load unpacked
	4.	Select the extension/ folder



## 🌍 Deployment
	•	Backend deployed on Render
	•	PostgreSQL hosted on Neon
	•	Environment-based DB + SSL handling
	•	Production-ready configuration



## 📌 Why This Project Matters

This project demonstrates:
	•	Real-world browser automation
	•	Secure backend engineering
	•	Handling SPA complexity
	•	Authentication & authorization
	•	Cloud deployment + database integration




## 🚧 Future Enhancements
	•	React dashboard UI
	•	Resume–JD matching with embeddings
	•	Smart follow-up reminders
	•	OAuth login
	•	Email notifications



