const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// File paths
const DATA_DIR = path.join(__dirname, 'data');
const KB_FILE = path.join(DATA_DIR, 'college_kb.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries.json');
const NOTICES_FILE = path.join(DATA_DIR, 'notices.json');

// Helper to safely read JSON
function readJson(filePath, defaultData = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultData;
  }
}

// Helper to safely write JSON
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Load College Knowledge Base
let collegeKB = readJson(KB_FILE);

// Analytics tracker in-memory
const analytics = {
  totalQueries: 142,
  queriesByTopic: {
    admissions: 48,
    fees: 35,
    placements: 32,
    branches: 18,
    hostel: 9
  },
  engineUsed: {
    gemini: 0,
    knowledgeEngine: 142
  }
};

// ==========================================
// 1. FREE GOOGLE GEMINI AI CALLER
// ==========================================
async function callGeminiAPI(userMessage, chatHistory = [], customApiKey = null, customModel = 'gemini-1.5-flash') {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_free_google_gemini_api_key_here') {
    return null; // Fallback to local knowledge engine
  }

  // Choose supported model
  const model = customModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // System instruction with complete College context
  const systemInstruction = `
You are "AeroBot", the official AI Virtual Assistant for Apex Institute of Technology & Engineering (AITE Pune), a top NAAC A++ accredited engineering college.
Your goal is to assist prospective students, current students, and parents with accurate, warm, helpful, and concise information in English, Hindi, or Hinglish (based on how the user asks).

KEY FACTS & COLLEGE CONTEXT:
- College Name: Apex Institute of Technology & Engineering (AITE), established 2004, Autonomous institute.
- Accreditation: NAAC A++ (CGPA 3.68), NIRF Top 70, AICTE Approved, NBA Accredited (CSE, AI&DS, ECE, ME).
- Location: Innovation Valley, Knowledge Zone, Pune, Maharashtra.
- Programs: B.Tech (4 Years) in Computer Science & Engineering (CSE), AI & Data Science (AI&DS), CSE (Cyber Security), Electronics & Communication (ECE), Mechanical Engineering (ME), Civil & Infrastructure Engineering, Electrical & EV Engineering.
- Placements (2025-26): Overall 94.2% placement rate. Highest Domestic: ₹48.5 LPA (Microsoft), Highest International: ₹62.0 LPA (Rakuten, Tokyo), Average: ₹8.85 LPA (CSE/AI average ₹11.2 LPA). 240+ recruiting companies including Google, Microsoft, Amazon, Adobe, Cisco, NVIDIA, TCS, Deloitte, Tata Motors.
- B.Tech Fees (Annual): General/Open: ₹1,50,000 | OBC/EBC: ₹92,500 | AICTE TFWS (Tuition Fee Waiver): ₹35,000 | SC/ST: ₹5,000 (scholarship covers remaining).
- Hostel & Mess: Non-AC 3-Sharing: ₹77,000/year (with 4 daily meals) | AC 2-Sharing: ₹1,10,000/year. Refundable deposit: ₹10,000.
- Eligibility: 10+2 with Physics & Math + Chem/CS with minimum 50% marks (45% for reserved category) + valid JEE Main or State CET score. Direct 2nd year for Diploma holders (min 45%).
- Cutoffs (General): CSE: 94.8%ile, AI&DS: 93.2%ile, Cyber Security: 91.6%ile, ECE: 87.5%ile, ME: 79.0%ile, Civil: 75.5%ile, Electrical: 82.0%ile.
- Contact: Admission Helpline: +91 98765 43210 | Email: admissions@apextech.edu.in.

GUIDELINES:
1. Always be polite, encouraging, and clear.
2. If asked in Hindi/Hinglish (e.g. "fees kitni hai?", "CSE ka placement kaisa hai?"), respond warmly in Hinglish or Hindi as appropriate.
3. Highlight key numbers (packages, fees, cutoffs) using bullet points and bold text.
4. If a student is interested in admission or wants counseling, encourage them to fill out the inquiry form or contact the helpline +91 98765 43210.
5. If someone asks something unrelated to education or the college, politely pivot back to how you can help them regarding AITE college, admissions, courses, or campus life.
`;

  // Build contents array with history
  const contents = [];

  // Add conversation history (up to last 6 messages)
  if (Array.isArray(chatHistory)) {
    const recentHistory = chatHistory.slice(-6);
    for (const msg of recentHistory) {
      if (msg.role && msg.content) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      }
    }
  }

  // Add current message
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.65,
      maxOutputTokens: 800,
      topP: 0.95
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return reply || null;
}

// ==========================================
// 2. INTELLIGENT LOCAL KNOWLEDGE NLP ENGINE
// (100% Free, Zero-Network, Real-time Fallback)
// ==========================================
function localKnowledgeBot(query) {
  const q = query.toLowerCase().trim();
  const kb = collegeKB;

  // Track analytics
  analytics.totalQueries++;

  // 1. GREETINGS & INTRO
  if (/^(hi|hello|hey|namaste|pranam|hola|kaisa|kaise ho|who are you|koun ho)/i.test(q)) {
    return {
      text: `👋 **Namaste! Welcome to Apex Institute of Technology & Engineering (AITE Pune).**\n\nI am **AeroBot**, your AI campus guide! How can I assist you today?\n\nYou can ask me about:\n- 🎯 **Admissions 2026 & Cutoffs**\n- 💰 **Fee Structure & Scholarships**\n- 💼 **Placements & Top Recruiters**\n- 📚 **B.Tech Branches & Curriculum**\n- 🏨 **Hostel & Campus Facilities**\n- 📞 **Helpline & Contact Details**`,
      chips: ["Admissions 2026", "Fee Structure", "Placement Stats", "B.Tech Branches", "Hostel Fees", "Check Eligibility"]
    };
  }

  // 2. ADMISSION & ELIGIBILITY
  if (/(admiss|eligib|apply|process|form|last date|entrance|how to join|kab start|criteria|jee main|mht cet)/i.test(q)) {
    analytics.queriesByTopic.admissions++;
    return {
      text: `🎓 **B.Tech Admissions (2026-2027 Batch) - AITE Pune**\n\n` +
            `**1. Eligibility Criteria:**\n` +
            `• **First Year B.Tech:** 10+2 passed with Physics & Mathematics compulsory + Chemistry/CS/Biotech with min **50% marks** (45% for reserved category) + valid score in **JEE Main** or **MHT-CET**.\n` +
            `• **Direct 2nd Year (Lateral Entry):** Diploma in Engineering or B.Sc. with minimum **45% marks**.\n\n` +
            `**2. Seat Quotas:**\n` +
            `• 65% State CAP Merit Seats\n` +
            `• 20% All India JEE Main Quota\n` +
            `• 15% Institutional / NRI Quota\n\n` +
            `**3. Important Documents:**\n` +
            `• 10th & 12th Marksheets\n` +
            `• JEE / CET Score Card\n` +
            `• Domicile, Nationality, Caste & Validity (if applicable)\n` +
            `• Income Certificate (for TFWS/Scholarships)\n\n` +
            `👉 *Want to verify your branch eligibility? Click "Check Eligibility" below or fill our admission call-back form!*`,
      chips: ["Check Eligibility", "Cutoffs 2025-26", "Fee Structure", "Apply for Counseling"]
    };
  }

  // 3. CUTOFFS
  if (/(cutoff|cut off|percentile|rank|marks required|kitne percentile)/i.test(q)) {
    analytics.queriesByTopic.admissions++;
    let cutoffTable = `📊 **Expected / Previous Year Cutoffs (MHT-CET / JEE Main Percentiles):**\n\n` +
      `| Branch | General / Open | OBC | SC / ST | EWS |\n` +
      `|---|---|---|---|---|\n`;
    
    kb.branches.forEach(b => {
      cutoffTable += `| **${b.code}** | ${b.cutoffPercentile.general}%ile | ${b.cutoffPercentile.obc}%ile | ${b.cutoffPercentile.sc_st}%ile | ${b.cutoffPercentile.ews}%ile |\n`;
    });

    cutoffTable += `\n💡 *Note: Cutoffs may vary slightly per CAP round. Institutional round inquiries can be submitted via the Admission Form.*`;
    return {
      text: cutoffTable,
      chips: ["B.Tech Branches", "Fee Structure", "Placement Stats", "Apply for Counseling"]
    };
  }

  // 4. FEES & EXPENSES
  if (/(fee|fees|kharcha|cost|paisa|rupee|tuition|hostel fee|mess fee|bus fee)/i.test(q)) {
    analytics.queriesByTopic.fees++;
    const f = kb.fees.annualFeeStructure;
    return {
      text: `💳 **Annual Academic Fee Structure (2026-27):**\n\n` +
            `• **Open / General Category:** **₹1,50,000 / year** *(Tuition: ₹1,15,000 + Dev: ₹25,000 + Other: ₹10,000)*\n` +
            `• **OBC / EBC / EWS Category:** **₹92,500 / year** *(50% Tuition fee reimbursed by Govt)*\n` +
            `• **AICTE TFWS Scheme:** **₹35,000 / year** *(100% Tuition Fee waived for income < 8 LPA)*\n` +
            `• **SC / ST Category:** **₹5,000 / year** *(100% covered under Social Welfare Scholarship)*\n\n` +
            `🏨 **Hostel & Mess Charges (Annual):**\n` +
            `• **3-Sharing Non-AC:** ₹77,000 (Room ₹45k + 4 Meals/day Mess ₹32k)\n` +
            `• **2-Sharing AC:** ₹1,10,000 (Room ₹75k + 4 Meals/day Mess ₹35k)\n` +
            `• Refundable Caution Deposit: ₹10,000 (one-time)\n\n` +
            `🚌 **Bus Transport:** ₹24,000 - ₹32,000 / year (routes covering 35+ city zones).`,
      chips: ["Fee Calculator Tool", "Scholarships", "Hostel Facilities", "CSE Fees"]
    };
  }

  // 5. SCHOLARSHIPS
  if (/(scholarship|concession|waiver|tfws|ebc|free seat|financial aid)/i.test(q)) {
    analytics.queriesByTopic.fees++;
    let text = `🌟 **Scholarships & Financial Assistance at AITE:**\n\n`;
    kb.scholarships.forEach((s, idx) => {
      text += `**${idx + 1}. ${s.name}**\n• Benefit: **${s.amount}**\n• Eligibility: ${s.criteria}\n\n`;
    });
    text += `💡 *Over 40% of our students receive some form of government or institutional fee waiver!*`;
    return {
      text,
      chips: ["Fee Structure", "Check Eligibility", "Admissions 2026"]
    };
  }

  // 6. PLACEMENTS & PACKAGES
  if (/(placement|package|salary|job|recruiter|company|companies|highest|average|avg package|lpa|internship)/i.test(q)) {
    analytics.queriesByTopic.placements++;
    const p = kb.placements;
    let recList = p.topRecruiters.slice(0, 6).map(r => `• **${r.name}**: ${r.package} (${r.role})`).join('\n');
    return {
      text: `🚀 **Campus Placement Highlights (${p.year}):**\n\n` +
            `• **Placement Rate:** **${p.stats.overallPlacementRate}**\n` +
            `• **Highest Domestic Package:** **${p.stats.highestPackage}**\n` +
            `• **Highest International Package:** **${p.stats.highestInternational}**\n` +
            `• **Average Package:** **${p.stats.averagePackage}** *(CSE/AI avg ₹11.2 LPA)*\n` +
            `• **Median Package:** **${p.stats.medianPackage}**\n` +
            `• **Total Offers:** **${p.stats.totalOffers}** across **${p.stats.participatingCompanies}+ companies**\n` +
            `• **Dream Offers (> 10 LPA):** **${p.stats.dreamOffersAbove10LPA}**\n\n` +
            `🏢 **Top Recruiting Marquee Partners:**\n${recList}\n\n` +
            `💡 *The Training & Placement Cell (TPC) conducts coding bootcamps, mock FAANG interviews, and guarantees 6-month industry internships!*`,
      chips: ["Top Recruiters List", "CSE Placements", "B.Tech Branches", "Admissions 2026"]
    };
  }

  // 7. SPECIFIC BRANCHES (CSE, AI, CYBER, ECE, ME, CIVIL, EE)
  if (/(branch|course|department|cse|computer science|ai|data science|cyber|ece|electronics|mechanical|civil|electrical)/i.test(q)) {
    analytics.queriesByTopic.branches++;
    
    // Check specific branch match
    if (/cse|computer science/i.test(q) && !/cyber/i.test(q)) {
      const b = kb.branches.find(x => x.code === 'CSE');
      return {
        text: `💻 **B.Tech - Computer Science & Engineering (CSE)**\n\n` +
              `• **Intake:** ${b.intake} seats\n` +
              `• **Average Package:** **${b.avgPackage}** | Highest: **${b.highestPackage}**\n` +
              `• **General Cutoff:** ${b.cutoffPercentile.general}%ile (OBC: ${b.cutoffPercentile.obc}%ile)\n` +
              `• **Curriculum Focus:** Full-Stack Web/App Development, Cloud Computing, Distributed Systems, Algorithms, Machine Learning & DevOps.\n` +
              `• **Key Labs:** Advanced Computing Lab, Cloud Virtualization Lab, Open Source Hub.`,
        chips: ["CSE Fees", "CSE Cutoffs", "Placement Stats", "Other Branches"]
      };
    }

    if (/ai|artificial intelligence|data science|aids/i.test(q)) {
      const b = kb.branches.find(x => x.code === 'AIDS');
      return {
        text: `🤖 **B.Tech - Artificial Intelligence & Data Science (AI & DS)**\n\n` +
              `• **Intake:** ${b.intake} seats\n` +
              `• **Average Package:** **${b.avgPackage}** | Highest: **${b.highestPackage}**\n` +
              `• **General Cutoff:** ${b.cutoffPercentile.general}%ile\n` +
              `• **Curriculum Focus:** Deep Learning, NLP, Generative AI, Computer Vision, Big Data Analytics & Neural Networks.\n` +
              `• **Special Lab:** NVIDIA High Performance GPU Computing Research Center.`,
        chips: ["AI&DS Fees", "Placement Stats", "Cutoffs 2025-26", "Apply for Counseling"]
      };
    }

    // Default branches list
    let list = kb.branches.map(b => 
      `• **${b.name} (${b.code})**: ${b.intake} seats | Avg: **${b.avgPackage}** | Cutoff: ${b.cutoffPercentile.general}%ile`
    ).join('\n');

    return {
      text: `📚 **B.Tech Engineering Programs Offered (4 Years / 8 Semesters):**\n\n${list}\n\n` +
            `All undergraduate programs are accredited by NBA / approved by AICTE and affiliated under Autonomous status.`,
      chips: ["CSE Details", "AI & Data Science", "ECE Details", "Fee Structure", "Placement Stats"]
    };
  }

  // 8. HOSTEL & CAMPUS FACILITIES
  if (/(hostel|room|mess|food|stay|accommodation|wifi|gym|sports|library|canteen|cafeteria|transport|bus)/i.test(q)) {
    analytics.queriesByTopic.hostel++;
    return {
      text: `🏨 **Campus & Hostel Infrastructure at AITE:**\n\n` +
            `• **Hostels:** 3 Boys & 2 Girls Hostels on-campus (1,800 capacity) with biometric entry, 24x7 security & CCTV.\n` +
            `• **Hostel Fee:** Non-AC 3-Sharing: ₹77,000/yr | AC 2-Sharing: ₹1,10,000/yr (includes 4 daily meals, laundry & Wi-Fi).\n` +
            `• **Central Digital Library:** 1,20,000+ volumes, IEEE/ACM journals, 24x7 AC reading hall (600 seating).\n` +
            `• **Sports Complex:** Floodlit cricket ground, football arena, synthetic tennis courts, indoor badminton & gymnasium.\n` +
            `• **Food & Dining:** 3 multi-cuisine cafeterias, hygienic mess audited by FSSAI, Cafe Coffee Day express outlet.\n` +
            `• **Transport:** 25 GPS-enabled AC buses covering all zones of the city.`,
      chips: ["Hostel Fees", "Campus Tour Video", "Admissions 2026", "Helpline Number"]
    };
  }

  // 9. EVENTS, FESTS & CLUBS
  if (/(fest|event|cultural|techfest|technovanza|tarang|club|hackathon|sports meet)/i.test(q)) {
    return {
      text: `🎪 **Vibrant Campus Life & Events at AITE:**\n\n` +
            `• **Technovanza (National TechFest - Feb):** 24-hr Hackathons, Robo-Wars, Drone Grand Prix with ₹6 Lakh prize pool.\n` +
            `• **Tarang (Annual Cultural Fest - March):** Star celebrity concert night, fashion show, battle of bands, dance competitions.\n` +
            `• **Spardha (Sports Championship - Jan):** Inter-college sports across cricket, football, athletics, badminton.\n\n` +
            `🏆 **Active Student Clubs:**\n` +
            `• Google Developer Student Club (GDSC)\n` +
            `• Team Apex Motorsports (Formula Student Electric Car)\n` +
            `• CyberKnights (Ethical Hacking & CTF)\n` +
            `• IEEE & ACM Student Chapters\n` +
            `• Rotaract & NSS Social Initiatives`,
      chips: ["Campus Facilities", "B.Tech Branches", "Admissions 2026"]
    };
  }

  // 10. CONTACT, HELPLINE & LOCATION
  if (/(contact|phone|number|email|address|location|kaha hai|reach|where is|helpline|counselor)/i.test(q)) {
    const c = kb.college.contact;
    return {
      text: `📞 **Contact & Campus Location:**\n\n` +
            `• **Institute:** **${kb.college.name}**\n` +
            `• **Address:** ${kb.college.address}\n` +
            `• **Admission Helpline:** **${c.admissionHelpline}**\n` +
            `• **Admission Email:** \`${c.admissionEmail}\`\n` +
            `• **General Phone:** ${c.generalPhone}\n` +
            `• **Placement Office:** \`${c.tpoEmail}\`\n` +
            `• **Anti-Ragging 24x7 Toll-Free:** ${c.antiRagging}\n` +
            `• **Visiting Hours:** ${c.visitingHours}\n\n` +
            `👉 *You can submit your callback request directly through our in-chat inquiry form!*`,
      chips: ["Apply for Counseling", "Admissions 2026", "Fee Structure", "Check Eligibility"]
    };
  }

  // DEFAULT SMART RESPONSE
  return {
    text: `I'd be glad to help you with that! At **${kb.college.shortName}**, we offer state-of-the-art engineering education, 94.2% placement records, and comprehensive scholarships.\n\nCould you please choose one of the topics below or tell me your branch of interest?`,
    chips: ["Admissions 2026", "Cutoffs 2025-26", "Fee Structure", "Placement Records", "Check Eligibility", "Contact Helpline"]
  };
}

// ==========================================
// 3. API ENDPOINTS
// ==========================================

// Main Chat Endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history = [], apiKey, model } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    // 1. Try Free Gemini AI if key is provided (either from request or server .env)
    const activeKey = apiKey || process.env.GEMINI_API_KEY;
    if (activeKey && activeKey !== 'your_free_google_gemini_api_key_here') {
      try {
        const geminiReply = await callGeminiAPI(message, history, activeKey, model);
        if (geminiReply) {
          analytics.engineUsed.gemini++;
          return res.json({
            reply: geminiReply,
            engine: 'gemini',
            model: model || 'gemini-1.5-flash',
            suggestedQuestions: [
              "What is the fee structure for CSE?",
              "Tell me about placements & top companies",
              "How to apply for 2026 admission?",
              "What are the hostel charges?"
            ]
          });
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, gracefully switching to local knowledge engine:', geminiError.message);
      }
    }

    // 2. Fallback to Local Knowledge NLP Engine (Works instantly with 0 API keys)
    analytics.engineUsed.knowledgeEngine++;
    const localResult = localKnowledgeBot(message);
    return res.json({
      reply: localResult.text,
      engine: 'knowledge-engine',
      suggestedQuestions: localResult.chips || [
        "Admissions 2026",
        "Fee Structure",
        "Placement Stats",
        "Check Eligibility"
      ]
    });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({
      error: 'Failed to process chat query',
      details: error.message
    });
  }
});

// College Information
app.get('/api/college-info', (req, res) => {
  res.json({ success: true, data: collegeKB.college });
});

// B.Tech Branches
app.get('/api/branches', (req, res) => {
  res.json({ success: true, data: collegeKB.branches });
});

// Fees & Scholarships
app.get('/api/fees', (req, res) => {
  res.json({
    success: true,
    data: {
      annual: collegeKB.fees.annualFeeStructure,
      hostel: collegeKB.fees.hostelAndMess,
      bus: collegeKB.fees.busTransportation,
      scholarships: collegeKB.scholarships
    }
  });
});

// Placements
app.get('/api/placements', (req, res) => {
  res.json({ success: true, data: collegeKB.placements });
});

// FAQs
app.get('/api/faq', (req, res) => {
  res.json({ success: true, data: collegeKB.faq });
});

// Notices
app.get('/api/notices', (req, res) => {
  const notices = readJson(NOTICES_FILE, []);
  res.json({ success: true, data: notices });
});

app.post('/api/notices', (req, res) => {
  const { title, category, summary, pinned = false } = req.body;
  if (!title || !category || !summary) {
    return res.status(400).json({ error: 'Title, category, and summary are required' });
  }

  const notices = readJson(NOTICES_FILE, []);
  const newNotice = {
    id: `NOT-${Date.now().toString().slice(-4)}`,
    title,
    category,
    date: new Date().toISOString().split('T')[0],
    pinned: Boolean(pinned),
    summary
  };

  notices.unshift(newNotice);
  writeJson(NOTICES_FILE, notices);
  res.status(201).json({ success: true, notice: newNotice });
});

// Inquiries / Leads (Capture prospective student contact)
app.get('/api/inquiries', (req, res) => {
  const inquiries = readJson(INQUIRIES_FILE, []);
  res.json({ success: true, count: inquiries.length, data: inquiries });
});

app.post('/api/inquiries', (req, res) => {
  const { fullName, email, phone, branch, examScore, city, question } = req.body;

  if (!fullName || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }

  const inquiries = readJson(INQUIRIES_FILE, []);
  const newInquiry = {
    id: `INQ-${Date.now().toString().slice(-4)}`,
    fullName: fullName.trim(),
    email: email ? email.trim() : 'N/A',
    phone: phone.trim(),
    branch: branch || 'Any Branch',
    examScore: examScore || 'N/A',
    city: city || 'Not specified',
    question: question || 'Direct inquiry through chatbot',
    status: 'Pending',
    timestamp: new Date().toISOString()
  };

  inquiries.unshift(newInquiry);
  writeJson(INQUIRIES_FILE, inquiries);

  res.status(201).json({
    success: true,
    message: 'Your admission inquiry has been received! Our counseling counselor will call you within 24 hours.',
    inquiryId: newInquiry.id
  });
});

app.patch('/api/inquiries/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const inquiries = readJson(INQUIRIES_FILE, []);
  const item = inquiries.find(x => x.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }

  if (status) item.status = status;
  writeJson(INQUIRIES_FILE, inquiries);

  res.json({ success: true, data: item });
});

// Interactive Tool 1: Eligibility Checker
app.post('/api/check-eligibility', (req, res) => {
  const { pcmPercentage, entrancePercentile, category = 'general' } = req.body;

  const pcm = parseFloat(pcmPercentage) || 0;
  const percentile = parseFloat(entrancePercentile) || 0;
  const cat = (category || 'general').toLowerCase();

  // Basic 12th eligibility: 50% for General, 45% for reserved
  const minRequiredPCM = cat === 'general' ? 50 : 45;
  const is12thEligible = pcm >= minRequiredPCM;

  const eligibleBranches = [];
  const ambitiousBranches = [];

  if (is12thEligible) {
    collegeKB.branches.forEach(b => {
      const requiredCutoff = b.cutoffPercentile[cat] || b.cutoffPercentile.general;
      if (percentile >= requiredCutoff) {
        eligibleBranches.push({
          code: b.code,
          name: b.name,
          cutoff: requiredCutoff,
          chance: 'High Chance (Direct CAP)'
        });
      } else if (percentile >= requiredCutoff - 4) {
        ambitiousBranches.push({
          code: b.code,
          name: b.name,
          cutoff: requiredCutoff,
          chance: 'Moderate Chance (Round 2/3 or Spot Round)'
        });
      }
    });
  }

  res.json({
    is12thEligible,
    minRequiredPCM,
    pcmEntered: pcm,
    percentileEntered: percentile,
    category: cat.toUpperCase(),
    eligibleBranches,
    ambitiousBranches,
    recommendation: !is12thEligible
      ? `Minimum ${minRequiredPCM}% marks in PCM is required as per AICTE norms. Please verify your marksheet.`
      : eligibleBranches.length > 0
        ? `Congratulations! You qualify for ${eligibleBranches.length} branches at AITE Pune based on previous cutoff benchmarks.`
        : `Your score is competitive for institutional merit rounds or later CAP spot rounds. Submit an inquiry for counselor assistance.`
  });
});

// Interactive Tool 2: Fee Calculator
app.post('/api/calculate-fees', (req, res) => {
  const { category = 'openGeneral', hostelType = 'none', bus = false } = req.body;

  const feeTable = collegeKB.fees.annualFeeStructure;
  const categoryFee = feeTable[category] || feeTable.openGeneral;

  let academicAnnual = categoryFee.total;
  let hostelAnnual = 0;
  let cautionDeposit = 0;
  let busAnnual = 0;

  if (hostelType === 'nonAc') {
    hostelAnnual = collegeKB.fees.hostelAndMess.nonAcThreeSharing.total;
    cautionDeposit = collegeKB.fees.hostelAndMess.cautionDeposit;
  } else if (hostelType === 'ac') {
    hostelAnnual = collegeKB.fees.hostelAndMess.acTwoSharing.total;
    cautionDeposit = collegeKB.fees.hostelAndMess.cautionDeposit;
  }

  if (bus) {
    busAnnual = collegeKB.fees.busTransportation.cityRoutes;
  }

  const firstYearTotal = academicAnnual + hostelAnnual + cautionDeposit + busAnnual;
  const fourYearTotal = (academicAnnual + hostelAnnual + busAnnual) * 4 + cautionDeposit;

  res.json({
    categorySelected: category,
    academicFeeAnnual: academicAnnual,
    feeBreakdown: categoryFee,
    hostelFeeAnnual: hostelAnnual,
    cautionDepositRefundable: cautionDeposit,
    busTransportAnnual: busAnnual,
    firstYearTotal,
    estimatedFourYearTotal: fourYearTotal
  });
});

// Analytics Dashboard Endpoint
app.get('/api/analytics', (req, res) => {
  const inquiries = readJson(INQUIRIES_FILE, []);
  res.json({
    success: true,
    data: {
      ...analytics,
      totalInquiries: inquiries.length,
      pendingInquiries: inquiries.filter(i => i.status === 'Pending').length,
      contactedInquiries: inquiries.filter(i => i.status === 'Contacted').length
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    institute: collegeKB.college.name,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 AITE Engineering College Chatbot Server is RUNNING!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🤖 Free AI Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini API Active' : 'Smart Offline Knowledge Engine (Free)'}`);
  console.log(`=======================================================`);
});

module.exports = { app, server };

