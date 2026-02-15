# HireSafe: A Unified Platform for Meetings and Secure Technical Interviews

<p align="center">
  <img src="client/public/logo.png" alt="HireSafe Logo" width="320" />
</p>

<p align="center">
  <strong>AI-powered interview platform with real-time anomaly detection, live coding environment, and secure video conferencing for fair and transparent technical interviews.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-7.0-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-8.x-47A248?logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/License-ISC-blue" alt="License" />
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Usage Guide](#-usage-guide)
- [API Endpoints](#-api-endpoints)
- [Socket.IO Events](#-socketio-events)
- [AI-Powered Anomaly Detection](#-ai-powered-anomaly-detection)
- [Database Models](#-database-models)
- [Contributing](#-contributing)

---

## 🌟 Overview

**HireSafe** is a full-stack web platform that merges the functionality of a **video conferencing tool** with a **secure technical interview environment**. It is designed for organizations, recruiters, and educators who need a reliable, cheat-resistant, and feature-rich system for conducting remote technical assessments.

Unlike generic meeting tools, HireSafe offers **AI-powered real-time anomaly detection** using face recognition technology, a **collaborative code editor** with multi-language support, and a **dedicated interviewer monitoring dashboard** — all seamlessly integrated into one platform.

### 🎯 Problem Statement

Remote technical interviews often face challenges like:
- **Cheating & impersonation** — candidates may use external help or proxies.
- **Lack of code evaluation tools** — many video platforms lack built-in coding environments.
- **No real-time behavioral monitoring** — interviewers have no visibility into suspicious activities.
- **Separate tools for meetings vs. interviews** — context switching reduces efficiency.

HireSafe addresses all of these by providing a **unified platform** for both casual video meetings and secure, monitored technical interviews.

---

## 🚀 Key Features

### 🎥 Video Conferencing (Meetings Module)
- **Peer-to-peer HD Video Calls** using WebRTC for low-latency, real-time communication.
- **Screen Sharing** — present your entire screen to other participants with one click.
- **Camera & Microphone Toggle** — independent control over audio and video streams, synced in real-time with remote participants via Socket.IO.
- **Real-time Chat** — send and receive text messages within a meeting session.
- **Meeting Code System** — create a unique 6-character alphanumeric meeting code or join an existing one.
- **Session Persistence** — meeting state is saved via `sessionStorage`, so refreshing the page reconnects gracefully.
- **Participant Awareness** — see usernames, camera/mic status indicators, and participant counts in real-time.

### 💻 Technical Interviews Module
- **Collaborative Code Editor** — powered by **Monaco Editor** (the same editor engine behind VS Code) with syntax highlighting, auto-indentation, line numbers, and word wrapping.
- **Multi-Language Support** — write and execute code in:
  - JavaScript (in-browser sandbox execution)
  - Python (Piston API / Pyodide fallback)
  - Java (Piston API)
  - C++ (Piston API)
- **Real-time Code Sync** — all code changes, language selections, and execution outputs are synchronized instantly between interviewer and candidate via Socket.IO.
- **Code Execution** — run code directly from the browser with output displayed in a terminal-like panel.
- **Boilerplate Templates** — each language starts with a ready-to-use "Hello World" template.
- **Role-Based Experience** — the interview creator is the **Interviewer** and the joiner is the **Candidate**, with differentiated UI and permissions.
- **Desktop-Only Enforcement** — interview sessions require a minimum screen resolution of 1024×600 to ensure proper functionality (camera, keyboard, multi-panel layout).

### 🤖 AI-Powered Anomaly Detection
- **Real-time Face Detection** using **face-api.js** (based on TensorFlow.js) loaded via the `@vladmandic/face-api` CDN.
- **12 Anomaly Types** detected and categorized by severity:

  | Severity | Anomaly Type | Description |
  |----------|-------------|-------------|
  | 🔴 Critical | `multiple_people` | Multiple faces detected in the camera frame |
  | 🔴 Critical | `candidate_absent` | No face detected — candidate may have left |
  | 🔴 Critical | `no_movement_detected` | Candidate is completely still (potential video loop) |
  | 🟠 Warning | `looking_away_extended` | Face detected but not looking at the screen |
  | 🟠 Warning | `suspicious_head_movement` | Rapid or unusual head movements |
  | 🟠 Warning | `reading_behavior` | Eye patterns suggest reading from another source |
  | 🟡 Moderate | `eyes_closed_extended` | Eyes have been closed for too long |
  | 🟡 Moderate | `high_stress_detected` | Facial expressions indicate high stress |
  | 🔵 Technical | `poor_video_quality` | Video quality is too low for reliable detection |
  | 🔵 Technical | `poor_lighting` | Lighting conditions are inadequate |
  | 🔵 Technical | `candidate_too_far` | Candidate is sitting too far from the camera |
  | 🔵 Technical | `candidate_too_close` | Candidate is sitting too close to the camera |

- **Confidence Scoring** — each detection comes with a 0–100% confidence score.
- **Interviewer-Only Dashboard** — real-time monitoring panel visible only to the interviewer, with:
  - Filter tabs: All / Critical / Warning / Moderate / Technical
  - Timestamp and severity for each event
  - Expandable detail view per anomaly
  - Summary statistics in the footer

### 🔒 Authentication & Security
- **JWT-Based Authentication** — secure token-based auth with 7-day expiry.
- **Password Hashing** — bcrypt with 10 salt rounds for secure password storage.
- **HTTP-Only Cookies** — tokens are stored in HTTP-only cookies to prevent XSS attacks.
- **Dual Auth Header Support** — both `x-auth-token` and `Authorization: Bearer` headers are supported.
- **Protected Routes** — authenticated-only areas (dashboard, meetings, interviews) are guarded by `ProtectedRoute` component.
- **Auto Session Restore** — on page load, the app checks `/user/profile` to restore the user session.

### 📊 Dashboard & Activity Tracking
- **User Dashboard** — personalized welcome screen with the user's activity feed.
- **Activity Log** — tracks and displays:
  - `LOGIN` — user login events
  - `MEETING` — meeting creation/participation
  - `INTERVIEW` — interview session activities
  - `PROFILE_UPDATE` — profile changes
  - `MALPRACTICE_DETECTION` — anomaly detections during interviews
- **Rich Activity Cards** — each activity entry shows an icon, title, description, timestamp, and duration.

### 🎨 UI/UX Design
- **Dark Mode Theme** — sleek, modern dark UI with glassmorphism effects (`backdrop-blur`).
- **Gradient Accents** — vibrant blue-to-purple gradients across CTAs and highlights.
- **Responsive Design** — fully responsive layout from mobile to desktop with Tailwind CSS.
- **Animated Background** — subtle pulsing background gradients with `radial-gradient` overlays.
- **Custom Toast Notifications** — styled with react-toastify using the dark theme, custom icons, and gradient progress bars.
- **Mobile Navigation** — hamburger menu with full mobile drawer navigation.
- **Font Awesome 7** — comprehensive icon set integrated via CDN.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT (React + Vite)                  │
│                                                                 │
│  ┌───────────┐  ┌───────────────┐  ┌──────────────────────────┐ │
│  │ Homepage  │  │   Meetings    │  │      Interviews          │ │
│  │           │  │   Module      │  │      Module              │ │
│  │ • Hero    │  │ • MeetingSetup│  │ • InterviewSetup         │ │
│  │ • Features│  │ • MeetingRoom │  │ • InterviewRoom          │ │
│  │ • CTA     │  │ • VideoGrid   │  │ • CodeEditor (Monaco)    │ │
│  │           │  │ • VideoCtrl   │  │ • VideoGrid + FaceDetect │ │
│  │           │  │ • ChatModal   │  │ • InterviewDashboard     │ │
│  │           │  │ • ScreenShare │  │ • ChatModal              │ │
│  └───────────┘  └───────┬───────┘  └───────────┬──────────────┘ │
│                         │    WebRTC + Socket.IO │               │
│  ┌──────────────┐       │                      │               │
│  │  Dashboard   │       │                      │               │
│  │  • Activity  │       │                      │               │
│  │    Log       │       │                      │               │
│  └──────┬───────┘       │                      │               │
│         │ REST API      │                      │               │
└─────────┼───────────────┼──────────────────────┼───────────────┘
          │               │                      │
          ▼               ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express + Node.js)                 │
│                                                                 │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐ │
│  │ Auth Controller │  │ Meeting Control │  │ Interview Control│ │
│  │ • Register      │  │ • Create        │  │ • Create         │ │
│  │ • Login         │  │ • Join          │  │ • Join           │ │
│  │ • Logout        │  │ • End           │  │ • End            │ │
│  └────────────────┘  └─────────────────┘  └──────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Socket Manager                           │  │
│  │  • Meeting Rooms (join-call, signal, toggle-camera, etc.) │  │
│  │  • Interview Rooms (join-interview, code-change, etc.)    │  │
│  │  • Malpractice Detection relay                            │  │
│  │  • Screen Share events                                    │  │
│  │  • Disconnect handlers with room cleanup                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌────────────────┐  ┌───────┴──────┐  ┌─────────────────────┐ │
│  │ User Controller│  │ Middleware   │  │ Activity Service     │ │
│  │ • Profile      │  │ • JWT Auth   │  │ • Log activity       │ │
│  │ • Update       │  │ • Cookie     │  │ • Get activities     │ │
│  │ • History      │  │   parsing    │  │ • Track sessions     │ │
│  └────────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │     MongoDB      │
                    │                  │
                    │  • Users         │
                    │  • Meetings      │
                    │  • Interviews    │
                    │  • Activities    │
                    └──────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.1 | UI component library |
| **Vite** | 7.0 | Build tool and dev server |
| **TailwindCSS** | 4.1 | Utility-first CSS framework |
| **Monaco Editor** | 4.7 | Code editor (VS Code engine) |
| **Socket.IO Client** | 4.8 | Real-time bidirectional communication |
| **face-api.js** | 0.3.1 | Client-side face detection and analysis |
| **Axios** | 1.10 | HTTP client for API requests |
| **React Router DOM** | 7.6 | Client-side routing |
| **React Toastify** | 11.0 | Toast notifications |
| **PrimeReact** | 10.9 | UI component library (supplementary) |
| **Font Awesome** | 7.0 | Icon library |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | Latest LTS | Runtime environment |
| **Express** | 5.1 | Web application framework |
| **Mongoose** | 8.16 | MongoDB object modeling |
| **Socket.IO** | 4.8 | Real-time event-based server |
| **JSON Web Token** | 9.0 | Authentication tokens |
| **bcrypt** | 6.0 | Password hashing |
| **cookie-parser** | 1.4 | Cookie parsing middleware |
| **cors** | 2.8 | Cross-Origin Resource Sharing |
| **dotenv-extended** | 2.9 | Environment variable management |
| **uuid** | 11.1 | UUID generation |
| **nodemon** | 3.1 | Development auto-restart |

### External APIs
| API | Purpose |
|-----|---------|
| **Piston API** (`emkc.org`) | Server-side code execution for Python, Java, C++ |
| **Pyodide** (CDN) | Client-side Python execution fallback |
| **face-api.js** (CDN) | Face detection ML models |

---

## 📁 Project Structure

```
HireSafe/
├── client/                          # Frontend (React + Vite)
│   ├── public/
│   │   ├── icon.png                 # Favicon
│   │   ├── logo.png                 # App logo
│   │   ├── interview.png            # Hero section image
│   │   └── models/                  # face-api.js ML model files
│   ├── src/
│   │   ├── main.jsx                 # App entry point
│   │   ├── App.jsx                  # Root component with routes
│   │   ├── App.css                  # Global styles
│   │   ├── index.css                # Base CSS
│   │   ├── Layout.jsx               # Layout wrapper (Navbar + Footer)
│   │   ├── ErrorBoundary.jsx        # React error boundary
│   │   ├── NotFound.jsx             # 404 page
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Auth provider (login, register, logout)
│   │   ├── services/
│   │   │   ├── activityService.js   # Activity API service
│   │   │   └── interviewService.js  # Interview API service
│   │   └── components/
│   │       ├── Homepage.jsx         # Landing page (Hero, Features, CTA)
│   │       ├── AuthPage.jsx         # Login / Register forms
│   │       ├── Navbar.jsx           # Responsive navigation bar
│   │       ├── Footer.jsx           # Site footer
│   │       ├── ProtectedRoute.jsx   # Auth guard for protected pages
│   │       ├── DashBoard/
│   │       │   ├── Dashboard.jsx    # Dashboard container
│   │       │   └── ActivityLog.jsx  # Activity feed component
│   │       ├── Meetings/
│   │       │   ├── Meetings.jsx     # Meeting module orchestrator
│   │       │   ├── MeetingSetup.jsx # Create / Join meeting UI
│   │       │   ├── MeetingRoom.jsx  # Active meeting room
│   │       │   ├── VideoGrid.jsx    # Video tile layout
│   │       │   ├── VideoControls.jsx# Camera, mic, screen share controls
│   │       │   ├── ChatModal.jsx    # In-meeting chat overlay
│   │       │   └── utils/
│   │       │       ├── socketUtils.js   # Socket.IO connection helpers
│   │       │       └── mediaUtils.js    # WebRTC media helpers
│   │       └── Interview/
│   │           ├── Interviews.jsx       # Interview module orchestrator
│   │           ├── InterviewSetup.jsx   # Create / Join interview UI
│   │           ├── InterviewRoom.jsx    # Active interview room
│   │           ├── CodeEditor.jsx       # Monaco code editor component
│   │           ├── VideoGrid.jsx        # Video tiles + face detection
│   │           ├── InterviewDashboard.jsx # Anomaly monitoring panel
│   │           ├── InterviewControls.jsx  # Interview control bar
│   │           ├── ChatModal.jsx        # In-interview chat overlay
│   │           └── utils/
│   │               ├── interviewFaceDetection.js  # Face detection engine
│   │               ├── socketUtils.js   # Interview socket helpers
│   │               └── mediaUtils.js    # WebRTC media helpers
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Client dependencies
│   └── vite.config.js               # Vite configuration
│
├── server/                          # Backend (Express + Node.js)
│   ├── index.js                     # Server entry point
│   ├── controller/
│   │   ├── auth.controller.js       # Register, Login, Logout
│   │   ├── user.controller.js       # Profile, Update, History
│   │   ├── meeting.controller.js    # Create, Join, End meetings
│   │   ├── interview.controller.js  # Create, Join, End interviews
│   │   └── socketManager.js         # All Socket.IO event handlers
│   ├── model/
│   │   ├── user.model.js            # User schema
│   │   ├── meeting.model.js         # Meeting schema
│   │   ├── interview.model.js       # Interview schema (with anomalies)
│   │   └── activity.model.js        # Activity log schema
│   ├── router/
│   │   ├── auth.router.js           # /auth routes
│   │   ├── user.router.js           # /user routes
│   │   ├── meeting.router.js        # /meeting routes
│   │   └── interview.router.js      # /interview routes
│   ├── middleware/
│   │   └── userAuth.js              # JWT verification middleware
│   ├── service/
│   │   └── activityService.js       # Activity logging service
│   ├── utils/
│   │   └── activityHelper.js        # Activity helper functions
│   └── package.json                 # Server dependencies
│
├── .gitignore                       # Git ignore rules
└── package.json                     # Root-level dependencies
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (local instance or MongoDB Atlas)

### 1. Clone the Repository

```bash
git clone https://github.com/Shreyanshu20/SafeHire.git
cd HireSafe
```

### 2. Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in both `client/` and `server/` directories (see [Environment Variables](#-environment-variables) below).

### 4. Start the Development Servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:9000`.

---

## 🔐 Environment Variables

### Server (`server/.env`)

```env
PORT=9000
MONGODB_URL=mongodb://localhost:27017/hiresafe
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

### Client (`client/.env`)

```env
VITE_BACKEND_URL=http://localhost:9000
```

> **Note:** For production deployments, update `VITE_BACKEND_URL` to your deployed server URL, set `NODE_ENV=production`, and use a strong, unique `JWT_SECRET`.

---

## 📖 Usage Guide

### Creating a Meeting

1. **Register/Login** — create an account or log in from the auth page.
2. Navigate to **Meetings** from the navbar or homepage.
3. Click the **"Create"** tab to generate a unique 6-character meeting code.
4. Share the meeting code with participants.
5. Click **"Connect to Meeting"** to enter the video room.
6. Use the floating control bar to toggle camera, microphone, screen sharing, or chat.

### Conducting an Interview

1. **Interviewer:** Navigate to **Interviews** and click **"Create"** to generate an interview session code.
2. Share the interview code with the candidate.
3. **Candidate:** Navigate to **Interviews**, switch to **"Join"**, enter the code, and connect.
4. Both parties see:
   - A **collaborative code editor** (left panel) with language selector and run button.
   - **Video feeds** (right panel) showing both participants.
5. **Interviewer only:** A **monitoring dashboard** below the video shows real-time anomaly detections with severity levels and confidence scores.
6. Code changes, language switches, and execution outputs are **synced in real-time**.

### Viewing Activity

1. Navigate to **Dashboard** from the navbar.
2. View your complete activity history: logins, meetings, interviews, and malpractice detections.

---

## 📡 API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/auth/register` | Register a new user | ❌ |
| `POST` | `/auth/login` | Login and receive JWT token | ❌ |
| `GET`  | `/auth/logout` | Logout and clear cookies | ❌ |

### User (`/user`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `GET`  | `/user/profile` | Get current user's profile | ✅ |
| `PUT`  | `/user/update` | Update user profile | ✅ |
| `GET`  | `/user/activities` | Get user activity history | ✅ |

### Meetings (`/meeting`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/meeting/create` | Create a new meeting room | ✅ |
| `POST` | `/meeting/join` | Join an existing meeting | ✅ |

### Interviews (`/interview`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/interview/create` | Create a new interview session | ✅ |
| `POST` | `/interview/join` | Join an existing interview | ✅ |

---

## 🔌 Socket.IO Events

### Meeting Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-call` | Client → Server | Join a meeting room with meeting code and username |
| `signal` | Bidirectional | WebRTC signaling (SDP offers/answers, ICE candidates) |
| `user-joined` | Server → Client | A new participant has joined |
| `user-left` | Server → Client | A participant has left |
| `toggle-camera` | Client → Server | Camera toggled on/off |
| `toggle-microphone` | Client → Server | Microphone toggled on/off |
| `user-camera-toggled` | Server → Client | Remote user's camera state changed |
| `user-microphone-toggled` | Server → Client | Remote user's mic state changed |
| `chat-message` | Bidirectional | In-meeting chat message |
| `screen-share-started` | Client → Server | Screen sharing initiated |
| `screen-share-stopped` | Client → Server | Screen sharing ended |
| `user-states` | Server → Client | Bulk sync of all user states for new joiners |
| `user-names` | Server → Client | Bulk sync of usernames for new joiners |

### Interview Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-interview` | Client → Server | Join an interview room |
| `code-change` | Bidirectional | Real-time code sync |
| `language-change` | Bidirectional | Programming language changed |
| `output-change` | Bidirectional | Code execution output sync |
| `interview-chat-message` | Bidirectional | In-interview chat message |
| `malpractice-detected` | Client → Server → Clients | Anomaly detection event |
| `end-interview` | Client → Server | Leave the interview session |

---

## 🤖 AI-Powered Anomaly Detection

The face detection system is powered by **face-api.js**, which runs TensorFlow.js-based machine learning models entirely in the browser.

### How It Works

1. **Model Loading** — On interview start, face detection models are loaded from the `/public/models/` directory.
2. **Continuous Analysis** — Video frames from the candidate's webcam are continuously analyzed for:
   - Face count (detecting multiple people or absence)
   - Head pose estimation (detecting looking away)
   - Eye landmark analysis (detecting closed eyes or reading patterns)
   - Movement tracking (detecting stillness or suspicious movement)
   - Facial expression analysis (detecting stress indicators)
   - Video quality assessment (lighting, distance from camera)
3. **Event Emission** — When an anomaly is detected with sufficient confidence, it is emitted via Socket.IO as a `malpractice-detected` event.
4. **Dashboard Display** — The interviewer's dashboard receives the event and displays it with appropriate severity, icon, and confidence score.

### Detection Configuration

The interview model stores detection preferences:
```javascript
interview_config: {
  duration_minutes: 60,       // Interview duration
  face_detection_enabled: true, // AI detection toggle
  code_editor_enabled: true,   // Code editor toggle
  recording_enabled: false     // Session recording
}
```

---

## 🗄 Database Models

### User Model
| Field | Type | Description |
|-------|------|-------------|
| `username` | String | Unique username |
| `email` | String | Unique email address |
| `password` | String | Bcrypt hashed password |
| `createdAt` | Date | Account creation timestamp |
| `updatedAt` | Date | Last update timestamp |

### Interview Model
| Field | Type | Description |
|-------|------|-------------|
| `session_id` | String | Unique 6-character session code |
| `interviewer_id` | ObjectId | Reference to the interviewer (User) |
| `interviewee_id` | ObjectId | Reference to the candidate (User) |
| `start_time` | Date | Interview start time |
| `end_time` | Date | Interview end time |
| `status` | Enum | `waiting` / `active` / `completed` / `cancelled` |
| `anomalies` | Array | List of detected anomalies with type, confidence, timestamp |
| `interview_config` | Object | Duration, face detection, code editor, recording settings |
| `metadata` | Object | Total anomalies, join time, code submissions |

### Meeting Model
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | ObjectId | Reference to the creator (User) |
| `meeting_code` | String | Unique meeting code |
| `date` | Date | Meeting creation date |
| `meeting_type` | Enum | `meeting` / `interview` |
| `interview_config` | Object | Optional interview-specific settings |

### Activity Model
| Field | Type | Description |
|-------|------|-------------|
| `user_id` | ObjectId | Reference to the user |
| `session_id` | String | Optional session identifier |
| `activity_type` | Enum | `LOGIN` / `MEETING` / `INTERVIEW` / `PROFILE_UPDATE` / `MALPRACTICE_DETECTION` |
| `description` | String | Activity description |
| `start_time` | Date | Activity start time |
| `end_time` | Date | Activity end time |
| `duration_minutes` | Number | Activity duration |
| `metadata` | Mixed | Additional metadata |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m "Add my feature"`
4. **Push** to the branch: `git push origin feature/my-feature`
5. **Open** a Pull Request

### Guidelines
- Follow the existing code style and project structure.
- Write meaningful commit messages.
- Test your changes before submitting a PR.
- Update documentation if adding new features.


---

<p align="center">
  Built by <strong>Shreyanshu20</strong>
</p>

<p align="center">
  <a href="#hiresafe-a-unified-platform-for-meetings-and-secure-technical-interviews">⬆ Back to Top</a>
</p>
