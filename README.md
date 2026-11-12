# 🎓 AeroBot - Engineering College AI Chatbot & Virtual Assistant
> Full-Stack, Production-Ready Virtual Assistant for Engineering Colleges with Free Google Gemini AI & Zero-Setup Knowledge Engine.

Built for **Apex Institute of Technology & Engineering (AITE Pune)** — Autonomous, NAAC A++ (CGPA 3.68), NIRF Top 70 Ranked Institution.

---

## 🌟 Key Features

### 1. 🤖 Dual-Engine Smart AI (100% Free)
- **Engine 1: Google Gemini 1.5 / 2.0 Flash (Free Tier)**:
  - Connects to Google's official Gemini Generative Language API.
  - Zero cost via [Google AI Studio](https://aistudio.google.com/app/apikey).
  - Understands English, Hindi, and natural Hinglish (*"fees kitni hai CSE ki?"*, *"placements kaisa hai?"*).
- **Engine 2: Smart Offline Knowledge Engine**:
  - Works **100% instantly without any API keys or internet**.
  - High-accuracy semantic NLP intent classification for all college information.
  - Automatic graceful fallback if Gemini key is omitted or quota is exhausted.

### 2. 📚 Comprehensive Engineering College Knowledge Base
- **Admissions 2026-27**: Eligibility criteria, CAP rounds, Lateral Entry (Diploma to 2nd year), documents needed, reservation quotas.
- **7 Accredited B.Tech Programs**: CSE, AI & Data Science, CSE (Cyber Security), ECE, Mechanical, Civil, Electrical & EV.
- **Cutoffs & Ranks**: Category-wise percentiles (General, OBC, SC/ST, EWS) for previous batches.
- **Fees & Scholarships**: Tuition fees, OBC/EBC 50% concession, TFWS 100% tuition waiver, Pragati Girl Child scholarship, post-matric schemes.
- **Placements & Internships**: 94.2% placement rate, ₹48.5 LPA highest (Microsoft), ₹8.85 LPA average, FAANG recruiters.
- **Hostel & Campus Facilities**: AC & Non-AC hostels with 4 meals daily mess, 1,20,000+ volume digital library, sports grounds, AC buses.
- **Campus Life**: Technovanza TechFest, Tarang Cultural Fest, GDSC, Motorsports, Robotics clubs.

### 3. 🛠️ Interactive Student Tools Built Directly In Chat
- 🎯 **Branch Eligibility Checker**: Enter 12th PCM % and JEE/CET rank to check high-chance & ambitious branch qualifications.
- 💰 **Smart Fee Calculator**: Real-time breakdown of annual academic, hostel, mess, bus transport, and 4-year degree costs.
- 📝 **Admission Call-Back Request (Lead Capture)**: Prospective students can submit inquiry details; saved directly into the backend database.
- 🎤 **Voice Input (Speech-to-Text)**: Speak questions in English/Hindi using the microphone button.
- 🔊 **Voice Read-Aloud (Text-to-Speech)**: Bot can read answers aloud with native speech synthesis.
- 📥 **Export Chat History**: Export and download chat transcripts as a `.txt` file with one click.

### 4. 📊 Admission Staff Admin Portal (`/admin.html`)
- Live inquiry leads dashboard with search & branch filters.
- Lead status workflow (`Pending` ➔ `Contacted` ➔ `Admitted` ➔ `Closed`).
- One-click CSV export of all student leads.
- Real-time analytics on trending questions.
- Dynamic campus notice publisher.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+ or v20+ or v24+)

### 1. Run the Project
Open terminal in the project directory:
```bash
cd "C:\Users\sahil sah\.gemini\antigravity\scratch\engineering-college-chatbot"
npm start
```

### 2. Access Web Portals
- **Student Chatbot UI**: [http://localhost:3000](http://localhost:3000)
- **Staff Admin Dashboard**: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 🔑 (Optional) Add Free Google Gemini API Key

The chatbot works **100% out of the box** without any API key using its built-in knowledge engine.

If you want to enable the free generative AI engine:
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey) (No credit card required).
2. Either:
   - Click the **Gear icon (⚙️)** in the chatbot top-right corner and paste your key. (Saved in browser localStorage).
   - Or paste it in the `.env` file:
     ```env
     GEMINI_API_KEY=AIzaSyYourFreeKeyHere
     ```
   - Restart server: `npm start`.

---

## 📁 Project Architecture

```
engineering-college-chatbot/
├── package.json             # Express, Cors, Dotenv dependencies
├── server.js                # REST API backend & NLP engine
├── .env                     # Environment variables (Port, Gemini API key)
├── .env.example             # Template for API keys
├── test-server.js           # Verification test suite
├── data/
│   ├── college_kb.json      # Comprehensive Engineering College Knowledge Base
│   ├── inquiries.json       # Student admission leads database
│   └── notices.json         # Live campus announcements
└── public/
    ├── index.html           # Modern responsive Chatbot UI
    ├── admin.html           # Staff leads & notice admin portal
    ├── css/
    │   └── style.css        # Glassmorphism, animations, markdown styling
    └── js/
        ├── app.js           # Chat client, voice recognition, TTS, widgets
        └── admin.js         # Admin portal controller & CSV export
```

---

## 🧪 Testing the API
To execute automated verification tests:
```bash
node test-server.js
```
All endpoints and mock student queries will run and log results.
