# CogniX Study Planner - GuideMe Document

Welcome to the **CogniX Study Planner**, an intelligent web application designed to help students optimize their study schedules and track their progress efficiently. This document will guide you through the system architecture, features, and how to get the project running on your local machine.

---

## 🏗️ System Architecture

CogniX is built using a modern decoupled architecture, separating the client-side presentation from the server-side logic and database operations.

1. **Frontend (Client)**: A React-based Single Page Application (SPA) built with Vite. It handles the user interface, routing, and state management. It communicates with the backend via RESTful API calls.
2. **Backend (Server)**: A Node.js server powered by the [Hono](https://hono.dev/) framework. It provides a fast, lightweight API layer that manages business logic, AI integration, and database interactions.
3. **Database**: A Serverless PostgreSQL database hosted on [Neon](https://neon.tech/). It stores user data, subjects, tasks, pomodoro sessions, and chat history.
4. **AI Integration**: The backend integrates directly with the Google Gemini API (`gemini-2.5-flash`) to power the intelligent study assistant chatbot.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18, React Router (v7)
- **Styling:** Tailwind CSS
- **Data Fetching:** TanStack Query (React Query)
- **Icons:** Lucide React
- **Notifications/Toasts:** Sonner

### Backend
- **Framework:** Hono (running on Node.js)
- **Database Driver:** `@neondatabase/serverless` & `postgres`
- **Authentication:** Auth.js (`@auth/core`) with custom credentials provider
- **Password Hashing:** Argon2
- **AI/LLM:** Google Gemini API (Direct Fetch integration)

---

## ✨ Key Features

- **Custom Authentication**: Secure email and password sign-up/sign-in with rigorous password strength validation and Argon2 hashing.
- **Subject & Task Management**: Add your study subjects and break them down into actionable tasks with due dates, priority levels, and statuses (To Do, In Progress, Completed).
- **Pomodoro Timer**: A customizable Pomodoro timer to help you focus. It tracks your study sessions and logs them in the database for analytics.
- **Analytics Dashboard**: Visualizes your study habits, showing task completion rates, Pomodoro session heatmaps, and weekly focus hours.
- **AI Study Assistant**: An integrated chat interface powered by Google Gemini. The AI has context about your subjects and can help answer questions or generate study plans.
- **Profile Settings**: Manage your personal information, update your password securely, and toggle application preferences (Dark/Light mode).

---

## 🚀 Local Setup & Installation

To run CogniX on your local machine, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A [Neon PostgreSQL](https://neon.tech/) database URL.
- A [Google Gemini API Key](https://aistudio.google.com/).

### 1. Clone the Repository
Clone the project to your local machine and navigate into the root directory.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder with the following variables:
   ```env
   # Database
   DATABASE_URL="your_neon_postgres_connection_string"

   # Authentication
   AUTH_SECRET="a_random_secure_string_for_auth"
   AUTH_TRUST_HOST=true
   AUTH_URL="http://localhost:4000/api/auth"

   # AI Integration
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will run on `http://localhost:4001`.*

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:4000`.*

---

## 🧪 Testing the Application (Credentials)
Separately for backend and frontend create 2 terminals

Within backend folder,run the following command
cd backend
npm run dev
Within frontend folder,run the following command
cd frontend
npm run dev

Once both servers are running, open your browser and go to `http://localhost:4000`. 

To easily experience the application without creating a new account from scratch, you can use the pre-seeded **Test User** account. This account comes pre-loaded with subjects, tasks, and a month's worth of Pomodoro sessions so you can immediately interact with the Analytics Dashboard.

**Test User Credentials:**
- **Email:** `testuser_cogniX_2@test.com`
- **Password:** `NewPass18!`

*(Note: If you test the "Change Password" feature in the Settings page, please remember the new password you set!)*

Enjoy using CogniX Study Planner!
