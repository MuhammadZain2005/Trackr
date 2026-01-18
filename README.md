<!-- Project: Trackr - Job application tracker -->
# Trackr

![Node.js](https://img.shields.io/badge/Runtime-Node.js-green)  ![Vite](https://img.shields.io/badge/DevTool-Vite-blue)  ![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

Trackr is a lightweight, privacy-focused job application tracker (a personal CRM) to help you manage applications, follow-ups, resumes, and reminders. It ships as a Vite-powered frontend and an Express backend, and is ready to integrate with Firebase (Auth / Firestore / Storage) for production use.

---

## Table of Contents
- [Description](#description)
- [Technologies Used](#technologies-used)
- [Project Structure](#project-structure)
- [Architecture Flow](#architecture-flow)
- [Data & Storage](#data--storage)
- [Installation & Setup](#installation--setup)
- [Usage](#usage)
- [Scripts](#scripts)
- [Firebase integration (recommended)](#firebase-integration-recommended)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Author](#author)
- [License](#license)

---

## Description
Trackr helps you track job applications (status, company, role), schedule follow-ups and reminders, manage multiple resumes, and keep notes and communications together. The repository currently uses a lightweight in-memory store for rapid development; moving to Firestore or another DB is straightforward and documented below.

This README follows the structure you provided and adapts it specifically for the Trackr project.

## Technologies Used
- Node.js + Express (backend)
- Vite (frontend)
- Firebase (optional - Auth, Firestore, Storage)
- Vanilla JavaScript, HTML, CSS (frontend pages)
- nodemon (development)

## Project Structure
```
Trackr/
├── frontend/
│   ├── index.html
│   ├── profile.html
│   ├── resumes.html
│   ├── public/                # static assets (logo.png served at /logo.png)
│   └── src/
│       └── styles.css
├── backend/
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── routes/
│       ├── controllers/
│       ├── db/
│       │   └── applicationDb.js   # in-memory store (dev)
│       └── middlewares/
└── README.md
```

## Architecture Flow
```
Frontend (Vite) <---> Backend (Express API)
  • Static pages served by Vite during dev
  • API calls from frontend to backend (/api/*)
  • Optional: Backend verifies Firebase ID tokens when Auth is enabled
```

## Data & Storage
- Development: in-memory store at `backend/src/db/applicationDb.js` (fast prototyping)
- Production: recommended to migrate to Firestore or another persistent DB
- Resumes: stored client-side for editing; use Firebase Storage for server-backed storage when ready

---

## Installation & Setup
Prerequisites:
- Node.js (v16+ recommended)
- npm (or yarn)

1) Backend

```zsh
cd /path/to/Trackr/backend
npm install
# Optional for Firebase Admin usage (see Firebase section):
# export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
npm run dev    # starts nodemon -> default http://localhost:5000
```

2) Frontend

```zsh
cd /path/to/Trackr/frontend
npm install
npm run dev    # starts Vite -> usually http://localhost:5173
```

Open the Vite URL printed in the terminal (usually `http://localhost:5173`). Backend API base URL: `http://localhost:5000` (health: `/api/health`).

## Usage
- Use the UI pages in `frontend/` (index, profile, resumes) during development.
- Backend exposes REST endpoints under `/api` (see `backend/src/routes/`).

## Scripts
- Backend (`/backend/package.json`):
  - `npm run dev` — start with nodemon
  - `npm start` — run production server (node)
- Frontend (`/frontend/package.json`):
  - `npm run dev` — start Vite dev server
  - `npm run build` — build for production
  - `npm run preview` — preview built output

---

## Firebase integration (recommended)
Follow this single-option flow to integrate Firebase securely.

1. In Firebase Console, create a project and enable Auth and Firestore (Storage if needed).
2. Create a service account (Project Settings → Service Accounts) and download the JSON key. Keep it out of the repo.
3. On the server, set the environment variable:

```zsh
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
```

4. Install Admin SDK in backend:

```zsh
cd backend
npm install firebase-admin
```

5. Initialize admin SDK (example file: `backend/src/config/firebase.js`):

```js
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp(); // uses GOOGLE_APPLICATION_CREDENTIALS
}

const db = admin.firestore();
const auth = admin.auth();
module.exports = { admin, db, auth };
```

6. Frontend: create a Firebase Web App in Project Settings and add client config to a `.env` file (Vite exposes env vars prefixed with `VITE_`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

7. Use client SDK on frontend for sign-in. For protected API routes, have the client send the ID token and verify it on the backend with `auth.verifyIdToken()`.

Recommendation: run Firebase Emulator Suite locally for Auth/Firestore testing.

---

## Environment variables
- `PORT` — backend port (defaults to 5000)
- `NODE_ENV` — environment (development/production)
- `GOOGLE_APPLICATION_CREDENTIALS` — absolute path to Firebase service account JSON (server only)
- `VITE_FIREBASE_*` — frontend Firebase client config (in `.env`)

Create a `.env.example` with the keys (do not include secrets) before sharing the repo.

## Troubleshooting
- Vite import errors: ensure dependencies are installed in `/frontend` and imports use correct package names. Example: if `latex.js` import fails, either install the correct package (e.g., `npm install latex.js`) or guard/remove the import while working.
- `npm` missing `package.json`: ensure you run commands inside `frontend/` or `backend/` directories.
- API 404s: confirm backend is running on expected `PORT` and frontend is pointing to correct API base URL. Configure a Vite proxy if necessary during dev.

## Contributing
1. Fork and branch from `main` (or `firebase_connection` if working on that branch):

```bash
git checkout -b feature/your-feature
# implement changes
git add .
git commit -m "feat: short description"
git push origin feature/your-feature
# open a pull request
```

- Keep secrets out of the repo. Use `.env` and platform secret managers.
- Add tests and documentation for new features.

## Author
👤 **Amritpal Singh** (project maintainer)

## License
This project is licensed under the [MIT License](LICENSE).

---

If you'd like, I can:
- Add a `.env.example` file and a `backend/src/config/firebase.js` starter file.
- Add badges (build, coverage) and screenshots to the README.

Ready to commit this README and push to `firebase_connection` when you say "go".
