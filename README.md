# 🎓 ISBM Bot - ISBM College of Engineering AI Virtual Assistant
> Full-Stack, Production-Ready Virtual Assistant for **ISBM College of Engineering (ISBM COE Pune)** with Free Google Gemini AI & Zero-Setup Knowledge Engine.

- **College**: ISBM College of Engineering, Pune (Peoples Empowerment Group)
- **DTE Institute Code**: **6622**
- **Affiliation**: Savitribai Phule Pune University (SPPU)
- **Approval**: Approved by AICTE, New Delhi & DTE Govt. of Maharashtra
- **Location**: ISBM Knowledge Campus, Nande Village, Pashan-Sus Road, Pune - 412115 (Near Hinjawadi IT Park)

---

## 🌟 Key Features

### 1. 🤖 Dual-Engine Smart AI (100% Free)
- **Engine 1: Google Gemini 1.5 / 2.0 Flash (Free Tier)**:
  - Official [Google AI Studio](https://aistudio.google.com/app/apikey) free API.
  - Zero cost, no credit card required.
  - Understands English, Marathi, Hindi, and natural Hinglish (*"Computer Engg fees kitni hai?"*, *"DTE code kya hai?"*, *"placements kaisa hai?"*).
- **Engine 2: Smart Offline Knowledge Engine**:
  - Works **100% instantly without any API keys or internet**.
  - Accurate semantic intent classification for all ISBM COE admission and academic info.
  - Automatic graceful fallback if Gemini key is omitted or quota is exhausted.

### 2. 📚 Comprehensive ISBM College of Engineering Knowledge Base
- **Admissions 2026-27**: MHT-CET & JEE Main Cutoffs, DTE Choice Code 6622, Direct 2nd Year Diploma admissions, document checklist.
- **B.E. Programs (SPPU Affiliated)**: Computer Engineering, AI & Data Science, Cyber Security, Electronics & Telecommunication (E&TC), Mechanical Engineering.
- **Fees & Govt Concessions**: General category (~₹1,08,000/yr), OBC/EBC 50% concession (~₹65,500), AICTE TFWS 100% tuition waiver (~₹23,000), SC/ST Govt Welfare (~₹4,000).
- **Placements & Internships**: 88.6% placement rate, ₹18.5 LPA highest package (Amazon), ₹6.40 LPA average, recruitments from Amazon, Capgemini, TCS, Infosys, Cognizant, Wipro, Tata Motors.
- **Hostel & Campus Facilities**: 25-Acre scenic eco-campus at Nande-Pashan, boys & girls hostels with 4 meals daily mess, 45,000+ books library, college bus fleet across Pune & PCMC.
- **Campus Life**: Orion Annual National TechFest & Cultural Fest, Parakram Sports Meet, Coding & Motorsports clubs.

### 3. 🛠️ Interactive Student Tools Built Directly In Chat
- 🎯 **Branch Eligibility Checker**: Enter 12th PCM % and MHT-CET/JEE percentile to check qualifying branch chances at ISBM COE.
- 💰 **Smart Fee Calculator**: Real-time breakdown of annual academic fee, hostel & mess, and bus transport.
- 📝 **Admission Call-Back Request (Lead Capture)**: Prospective students can submit admission inquiry details directly in chat, saved in database.
- 🎤 **Voice Input (Speech-to-Text)**: Speak questions in English/Hindi using the microphone button.
- 🔊 **Voice Read-Aloud (Text-to-Speech)**: Bot speaks answers out loud with native voice synthesis.
- 📥 **Export Chat History**: Export and download conversation transcripts as a `.txt` file with one click.

### 4. 📊 Admission Staff Admin Portal (`/admin.html`)
- Live student leads dashboard with search & branch filters.
- Lead status management (`Pending` ➔ `Contacted` ➔ `Admitted` ➔ `Closed`).
- One-click **CSV Export** for counseling and calling teams.
- Real-time analytics on trending questions.
- Dynamic campus notice publisher.

---

## 🚀 Quick Start Guide

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
The chatbot works **100% out of the box** without any API key.  
To enable Google's Gemini LLM:
1. Get a free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Click the **Gear icon (⚙️)** in the top-right corner of the chatbot and paste your key.

---

## 🧪 Testing the Project
Run the automated verification suite:
```bash
node test-server.js
```
