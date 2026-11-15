# 🚀 NexusCollab - Real-Time Collaborative Project Management Tool
> **Task 3: Collaborative Project Management Tool (Trello / Asana Clone)**  
> Built with modern full-stack architecture using **Node.js, SQLite (node:sqlite), and Native WebSockets (RFC 6455)**.

---

## 📌 Project Overview
**NexusCollab** is an interactive, full-stack project management platform inspired by Trello and Asana. It allows teams to create group projects, manage tasks via drag-and-drop Kanban boards, communicate in real time through task discussion threads, and receive instant WebSocket-powered notifications without page refreshes.

---

## 🏛️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT BROWSER (SPA)                            │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │ Interactive Kanban    │  │ Task Card Details &   │  │ Real-Time Toast │  │
│  │ Drag-and-Drop Columns │  │ Live Discussion Feed  │  │ & Notifications │  │
│  └──────────┬────────────┘  └───────────┬───────────┘  └────────┬────────┘  │
└─────────────┼───────────────────────────┼───────────────────────┼───────────┘
              │                           │                       │
              │ REST API (HTTP)           │ REST API              │ WebSocket Sync
              ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NODE.JS BACKEND SERVER                             │
│                                                                             │
│  ┌────────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ REST API Router & Controller       │  │ RFC 6455 WebSocket Server     │  │
│  │  - Auth (HMAC Token / Sessions)    │  │  - Bi-directional framing     │  │
│  │  - Projects & Members CRUD         │  │  - Live board state broadcast │  │
│  │  - Kanban Columns & Tasks API      │  │  - User-targeted alerts       │  │
│  │  - Comments & Activity Feeds       │  │  - Multi-client connection hub│  │
│  └─────────────────┬──────────────────┘  └──────────────┬────────────────┘  │
└────────────────────┼────────────────────────────────────┼───────────────────┘
                     │                                    │
                     ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    EMBEDDED SQLITE DATABASE (node:sqlite)                   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │    users     │  │   projects   │  │   columns    │  │      tasks      │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                                         │
│  │   comments   │  │notifications │                                         │
│  └──────────────┘  └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features Checklist (Task Requirements)

- [x] **Group Projects**: Create projects, customize themes, and manage team members with role-based access (*Owner*, *Member*).
- [x] **Project Boards**: Dynamic Kanban columns (*To Do*, *In Progress*, *Review*, *Done*, + Add Custom Columns).
- [x] **Task Cards**: Priority tags (*Low*, *Medium*, *High*, *Urgent*), due dates, assignee avatars, descriptions, and comment counters.
- [x] **Interactive Drag & Drop**: Move task cards seamlessly across columns with optimistic UI updates.
- [x] **Task Comments & Communication**: In-task live conversation threads with author attribution and timestamps.
- [x] **Auth & User Management**: Secure registration, login, token authentication, and multi-user demo simulator.
- [x] **Bonus - Real-Time WebSockets**: Instant updates broadcasted across all connected team members when cards move, comments are posted, or tasks are assigned.
- [x] **Bonus - In-App Notifications**: Notification bell with unread counters and live toast alerts.

---

## 👥 Pre-Configured Demo Accounts (Instant Collaboration Testing)

The database automatically pre-seeds 4 team members so you can test multi-user collaboration out of the box:

| Name | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Alex Johnson** | `alex@example.com` | `demo123` | Project Owner |
| **Priya Sharma** | `priya@example.com` | `demo123` | Senior Engineer |
| **Marcus Chen** | `marcus@example.com` | `demo123` | Designer / QA |
| **Sarah Miller** | `sarah@example.com` | `demo123` | Product Manager |

> **💡 Multi-User Simulation**: Click the user profile in the top-right navbar to switch between users in real time, or open two separate browser windows to see WebSocket events update across accounts simultaneously!

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+ / v22+ / v24+)
- **Backend Architecture**: Native HTTP REST Server + RFC 6455 WebSocket Server
- **Database**: Embedded SQLite using Node.js standard `node:sqlite` (Zero external setup required)
- **Security**: Cryptographic password hashing (SHA-256 with salt) & HMAC authentication tokens
- **Frontend**: Clean Single Page Application (HTML5, Responsive CSS Grid/Flexbox, Vanilla JS, Drag-and-Drop API)
- **Zero Heavy Dependencies**: Completely self-contained with maximum performance and no vulnerability vectors.

---

## 🚀 Getting Started Locally

### 1. Clone the Repository
```bash
git clone https://github.com/ashtabhujapatel01-coder/CodeAlpha_NexusCollab.git
cd CodeAlpha_NexusCollab
```

### 2. Run the Server
```bash
node server.js
```
*(Or `npm start`)*

### 3. Open in Browser
Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📁 Directory Structure

```text
CodeAlpha_NexusCollab/
├── server.js              # Complete Backend: REST API, SQLite DB, WebSocket Server
├── public/
│   └── index.html         # Frontend SPA: Kanban Boards, Modals, Real-Time Client
├── package.json           # Project manifest and scripts
├── .gitignore             # Git ignore configuration
└── README.md              # Project documentation and architecture guide
```

---

## 🔒 Security & Privacy
- **Zero Third-Party Leaks**: All data is stored locally in an embedded SQLite database (`data.db`).
- **No Sensitive Tokens in Version Control**: `.gitignore` prevents tracking local database cache files (`data.db-wal`, `data.db-shm`) and environment variables.
- **Pure Native Execution**: Eliminates supply-chain risks by utilizing Node.js built-in standard modules.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
