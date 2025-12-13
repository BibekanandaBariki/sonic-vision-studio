# Deployment Guide

This guide describes how to deploy the Sonic Vision Studio (Audio Streamer) application.

## Prerequisites
- A GitHub repository containing this project.
- Accounts on **Railway** (for Backend) and **Vercel** (for Frontend).
- A Google Cloud API Key for Gemini.

---

## 🏗 Backend Deployment (Spring Boot)

We recommend **Railway** or **Render** as they handle Docker/Java apps easily.

### Option 1: Railway (Recommended)
1.  **Login** to [Railway.app](https://railway.app/).
2.  Click **New Project** > **Deploy from GitHub repo**.
3.  Select this repository.
4.  **Important**: Configure the **Root Directory** to `backend`.
    - Go to Settings > Build > Root Directory: `/backend`.
5.  **Environment Variables**:
    - Go to the **Variables** tab.
    - Add `GEMINI_API_KEY`: `AIza...` (your actual key).
    - Add `SERVER_PORT`: `8080`.
    - Add `ALLOWED_ORIGINS`: `https://your-frontend-domain.vercel.app` (once you have it), or `*` for initial testing.
6.  Railway will automatically detect the `Dockerfile` and build it.
7.  Once deployed, copy the **Public URL** (e.g., `https://backend-production.up.railway.app`).

---

## 🎨 Frontend Deployment (React/Vite)

We recommend **Vercel** for optimal performance and ease of use.

1.  **Login** to [Vercel](https://vercel.com/).
2.  Click **Add New** > **Project**.
3.  Import your GitHub repository.
4.  **Framework Preset**: Select **Vite**.
5.  **Root Directory**: Click "Edit" and select `frontend`.
6.  **Environment Variables**:
    - `VITE_WS_URL`: `wss://your-backend-domain.up.railway.app/api/audio/stream` (Note: use `wss://` for secure WebSocket).
    - `VITE_SSE_URL`: `https://your-backend-domain.up.railway.app/api/transcription/stream`.
7.  Click **Deploy**.

---

## 🔒 Security & Best Practices

- **Never commit `.env` files**. The `.gitignore` is configured to exclude them.
- **Rotate Keys**: If you suspect a key leak, revoke it in Google Cloud Console immediately.
- **CORS**: In production, update the Backend `ALLOWED_ORIGINS` variable to only allow your Vercel frontend domain.

## 🛠 Local Development
To run locally:
1.  **Backend**:
    - Create `backend/.env` (see `.env.example`).
    - Run: `cd backend && mvn spring-boot:run`.
2.  **Frontend**:
    - Create `frontend/.env` (see `.env.example`).
    - Run: `cd frontend && npm run dev`.

## 🐳 Docker (Optional)
You can run the entire stack with Docker Compose if you add a `docker-compose.yml`, utilizing the provided `backend/Dockerfile` and `frontend/Dockerfile`.
