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

  const model = customModel || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // System instruction with ISBM College of Engineering context
  const systemInstruction = `
You are "ISBM Bot", the official AI Virtual Assistant for ISBM College of Engineering (ISBM COE Pune).
Your goal is to assist prospective students, current students, and parents with accurate, warm, helpful, and concise information in English, Hindi, or Hinglish (based on how the user asks).

KEY FACTS & ISBM COLLEGE OF ENGINEERING CONTEXT:
- College Name: ISBM College of Engineering (ISBM COE Pune), established 2010.
- Approvals & Affiliations: Approved by AICTE New Delhi, Recognized by DTE Govt. of Maharashtra (DTE Institute Code: 6622), Affiliated to Savitribai Phule Pune University (SPPU).
- Location: ISBM Knowledge Campus, S. No. 44/1, 44/1/2, Nande Village, Pashan-Sus Road, Pune, Maharashtra - 412115 (near Hinjawadi IT Hub).
- Programs: B.E. / B.Tech (4 Years / 8 Semesters) in Computer Engineering (CSE), AI & Data Science (AI & DS), Computer Engineering (Cyber Security), Electronics & Telecommunication (E&TC), and Mechanical Engineering.
- Placements: Overall 88.6% placement rate. Highest Package: ₹18.5 LPA (Amazon), Average: ₹6.4 LPA. Top recruiters: Amazon, Capgemini, TCS, Infosys, Cognizant, Wipro, Tech Mahindra, Tata Motors.
- B.E./B.Tech Fees (Annual): General/Open: ~₹1,08,000 | OBC/EBC: ~₹65,500 (50% tuition waiver) | AICTE TFWS: ~₹23,000 | SC/ST: ~₹4,000 (scholarship covers remaining).
- Hostel & Mess: Non-AC 3-Sharing: ₹70,000/year (with 4 daily meals) | AC 2-Sharing: ₹97,000/year. Refundable deposit: ₹10,000.
- Eligibility: 10+2 with Physics & Math + Chem/CS with minimum 45% marks (40% for reserved category) + valid score in MHT-CET 2026 or JEE Main Paper 1. Direct 2nd year for Diploma holders (min 45%).
- Cutoffs (General MHT-CET): Computer Engineering: ~88.5%ile, AI & DS: ~86.2%ile, Cyber Security: ~84.0%ile, E&TC: ~78.5%ile, Mechanical: ~72.0%ile.
- Contact: Admission Helpline: +91 88888 77777 / +91 88888 66666 | Phone: 020-66759400 | Email: admissions@isbmcoe.org | Website: https://www.isbmcoe.org

GUIDELINES:
1. Always be polite, encouraging, and clear.
2. If asked in Hindi/Hinglish (e.g. "fees kitni hai?", "CSE ka placement kaisa hai?", "DTE code kya hai?"), respond warmly in Hinglish or Hindi as appropriate.
3. Highlight key numbers (DTE Code: 6622, fees, cutoffs, packages) using bullet points and bold text.
4. If a student is interested in admission or wants counseling, encourage them to fill out the inquiry form or call +91 88888 77777.
5. If someone asks something unrelated to education or the college, politely pivot back to how you can help them regarding ISBM College of Engineering admissions, courses, or campus life.
`;

  const contents = [];

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

  analytics.totalQueries++;

  // 1. GREETINGS & INTRO
  if (/^(hi|hello|hey|namaste|pranam|hola|kaisa|kaise ho|who are you|koun ho)/i.test(q)) {
    return {
      text: `👋 **Namaste! Welcome to ISBM College of Engineering (ISBM COE Pune).**\n\nI am **ISBM Bot**, your official AI campus guide! How can I assist you today?\n\nYou can ask me about:\n- 🎯 **Admissions 2026 & DTE Code (6622)**\n- 💰 **Fee Structure & Govt Scholarships**\n- 💼 **Placements & Top Recruiters**\n- 📚 **B.E./B.Tech Branches (SPPU Affiliated)**\n- 🏨 **Hostel & Campus Facilities**\n- 📞 **Helpline & Contact Details**`,
      chips: ["Admissions 2026", "Fee Structure", "Placement Stats", "B.Tech Branches", "Hostel Fees", "Check Eligibility"]
    };
  }

  // 2. DTE CODE SPECIFIC
  if (/(dte code|choice code|institute code|college code)/i.test(q)) {
    analytics.queriesByTopic.admissions++;
    return {
      text: `🏛️ **ISBM College of Engineering - Official DTE Codes:**\n\n` +
            `• **DTE Institute Code:** **6622**\n` +
            `• **University Affiliation:** Savitribai Phule Pune University (SPPU)\n` +
            `• **AICTE Approval:** Approved by AICTE, New Delhi & DTE Maharashtra\n\n` +
            `👉 *During MHT-CET CAP option form filling, search with Institute Code **6622** to select ISBM College of Engineering Pune.*`,
      chips: ["Admissions 2026", "Cutoffs 2025-26", "B.Tech Branches", "Apply for Counseling"]
    };
  }

  // 3. ADMISSION & ELIGIBILITY
  if (/(admiss|eligib|apply|process|form|last date|entrance|how to join|kab start|criteria|jee main|mht cet)/i.test(q)) {
    analytics.queriesByTopic.admissions++;
    return {
      text: `🎓 **B.E. / B.Tech Admissions (2026-2027 Batch) - ISBM College of Engineering**\n\n` +
            `**1. Eligibility Criteria:**\n` +
            `• **First Year B.Tech:** 10+2 passed with Physics & Mathematics compulsory + Chemistry/CS/Biotech with min **45% marks** (40% for reserved category) + valid score in **MHT-CET 2026** or **JEE Main**.\n` +
            `• **Direct 2nd Year (Lateral Entry):** Diploma in Engineering or B.Sc. with minimum **45% marks** (40% reserved).\n\n` +
            `**2. Seat Quotas:**\n` +
            `• 65% State CAP Merit Seats (Choice Code: **6622**)\n` +
            `• 20% All India JEE Main Quota\n` +
            `• 15% Institutional / Management Quota\n\n` +
            `**3. Important Documents:**\n` +
            `• 10th & 12th Marksheets\n` +
            `• MHT-CET / JEE Score Card\n` +
            `• Maharashtra Domicile & Nationality Certificate\n` +
            `• Caste Certificate & Validity (if applicable)\n` +
            `• Income Certificate (for EBC/TFWS scholarships)\n\n` +
            `👉 *Want to verify your branch eligibility? Click "Check Eligibility" below or fill our admission call-back form!*`,
      chips: ["Check Eligibility", "Cutoffs 2025-26", "Fee Structure", "Apply for Counseling"]
    };
  }

  // 4. CUTOFFS
  if (/(cutoff|cut off|percentile|rank|marks required|kitne percentile)/i.test(q)) {
    analytics.queriesByTopic.admissions++;
    let cutoffTable = `📊 **Expected / Previous Year Cutoffs (MHT-CET Percentiles at ISBM COE):**\n\n` +
      `| Branch | General / Open | OBC | SC / ST | EWS |\n` +
      `|---|---|---|---|---|\n`;
    
    kb.branches.forEach(b => {
      cutoffTable += `| **${b.code}** | ${b.cutoffPercentile.general}%ile | ${b.cutoffPercentile.obc}%ile | ${b.cutoffPercentile.sc_st}%ile | ${b.cutoffPercentile.ews}%ile |\n`;
    });

    cutoffTable += `\n💡 *Note: Choice Code is 6622. Institutional round inquiries can be submitted via the Admission Form.*`;
    return {
      text: cutoffTable,
      chips: ["B.Tech Branches", "Fee Structure", "Placement Stats", "Apply for Counseling"]
    };
  }

  // 5. FEES & EXPENSES
  if (/(fee|fees|kharcha|cost|paisa|rupee|tuition|hostel fee|mess fee|bus fee)/i.test(q)) {
    analytics.queriesByTopic.fees++;
    return {
      text: `💳 **Annual Academic Fee Structure (2026-27) - ISBM COE:**\n\n` +
            `• **Open / General Category:** **₹1,08,000 / year** *(Tuition: ₹85,000 + Dev: ₹15,000 + Other: ₹8,000)*\n` +
            `• **OBC / EBC / EWS Category:** **₹65,500 / year** *(50% Tuition fee reimbursed by Govt of Maharashtra)*\n` +
            `• **AICTE TFWS Scheme:** **₹23,000 / year** *(100% Tuition Fee waived for income < 8 LPA)*\n` +
            `• **SC / ST Category:** **₹4,000 / year** *(100% covered under Social Welfare Scholarship)*\n\n` +
            `🏨 **Hostel & Mess Charges (Annual):**\n` +
            `• **3-Sharing Non-AC:** ₹70,000 (Room ₹40k + 4 Meals/day Mess ₹30k)\n` +
            `• **2-Sharing AC:** ₹97,000 (Room ₹65k + 4 Meals/day Mess ₹32k)\n` +
            `• Refundable Caution Deposit: ₹10,000 (one-time)\n\n` +
            `🚌 **Bus Transport:** ₹22,000 - ₹28,000 / year (covering Pune and PCMC).`,
      chips: ["Fee Calculator Tool", "Scholarships", "Hostel Facilities", "CSE Fees"]
    };
  }

  // 6. SCHOLARSHIPS
  if (/(scholarship|concession|waiver|tfws|ebc|free seat|financial aid)/i.test(q)) {
    analytics.queriesByTopic.fees++;
    let text = `🌟 **Scholarships & Financial Assistance at ISBM COE:**\n\n`;
    kb.scholarships.forEach((s, idx) => {
      text += `**${idx + 1}. ${s.name}**\n• Benefit: **${s.amount}**\n• Eligibility: ${s.criteria}\n\n`;
    });
    text += `💡 *All Maharashtra Government scholarships (MahaDBT) are fully applicable for eligible students at ISBM COE.*`;
    return {
      text,
      chips: ["Fee Structure", "Check Eligibility", "Admissions 2026"]
    };
  }

  // 7. PLACEMENTS & PACKAGES
  if (/(placement|package|salary|job|recruiter|company|companies|highest|average|avg package|lpa|internship)/i.test(q)) {
    analytics.queriesByTopic.placements++;
    const p = kb.placements;
    let recList = p.topRecruiters.map(r => `• **${r.name}**: ${r.package} (${r.role})`).join('\n');
    return {
      text: `🚀 **Campus Placement Highlights (${p.year}) - ISBM COE:**\n\n` +
            `• **Placement Rate:** **${p.stats.overallPlacementRate}**\n` +
            `• **Highest Package:** **${p.stats.highestPackage}**\n` +
            `• **Average Package:** **${p.stats.averagePackage}**\n` +
            `• **Median Package:** **${p.stats.medianPackage}**\n` +
            `• **Total Offers:** **${p.stats.totalOffers}** across **${p.stats.participatingCompanies}+ companies**\n\n` +
            `🏢 **Top Recruiting Companies:**\n${recList}\n\n` +
            `💡 *The Training & Placement Cell (TPC) provides coding bootcamps, mock interviews, and guaranteed internships with Hinjawadi & Pune IT companies!*`,
      chips: ["Computer Engg Placements", "B.Tech Branches", "Admissions 2026", "Helpline"]
    };
  }

  // 8. SPECIFIC BRANCHES
  if (/(branch|course|department|cse|computer engineering|ai|data science|cyber|ece|entc|telecom|mechanical)/i.test(q)) {
    analytics.queriesByTopic.branches++;
    
    if (/cse|computer/i.test(q) && !/cyber/i.test(q)) {
      const b = kb.branches.find(x => x.code === 'CSE');
      return {
        text: `💻 **Computer Engineering (CSE) - ISBM COE**\n\n` +
              `• **Degree:** B.E. (Affiliated to Savitribai Phule Pune University - SPPU)\n` +
              `• **Intake:** ${b.intake} seats\n` +
              `• **Average Package:** **${b.avgPackage}** | Highest: **${b.highestPackage}**\n` +
              `• **General Cutoff:** ${b.cutoffPercentile.general}%ile (OBC: ${b.cutoffPercentile.obc}%ile)\n` +
              `• **Curriculum:** SPPU Syllabus covering Software Engineering, Full-Stack, Cloud Computing, Algorithms & DevOps.`,
        chips: ["CSE Fees", "Placement Stats", "Apply for Counseling", "Other Branches"]
      };
    }

    if (/ai|artificial intelligence|data science|aids/i.test(q)) {
      const b = kb.branches.find(x => x.code === 'AIDS');
      return {
        text: `🤖 **Artificial Intelligence & Data Science (AI & DS) - ISBM COE**\n\n` +
              `• **Degree:** B.E. (SPPU Affiliated)\n` +
              `• **Intake:** ${b.intake} seats\n` +
              `• **Average Package:** **${b.avgPackage}** | Highest: **${b.highestPackage}**\n` +
              `• **General Cutoff:** ${b.cutoffPercentile.general}%ile\n` +
              `• **Curriculum Focus:** Machine Learning, Deep Neural Networks, Natural Language Processing, Big Data Analytics & Generative AI.`,
        chips: ["AI&DS Fees", "Placement Stats", "Cutoffs 2025-26", "Apply for Counseling"]
      };
    }

    let list = kb.branches.map(b => 
      `• **${b.name} (${b.code})**: ${b.intake} seats | Avg: **${b.avgPackage}** | Cutoff: ${b.cutoffPercentile.general}%ile`
    ).join('\n');

    return {
      text: `📚 **B.E. Engineering Programs Offered at ISBM COE (Affiliated to SPPU Pune):**\n\n${list}\n\n` +
            `All courses are approved by AICTE New Delhi and DTE Govt. of Maharashtra (Code: 6622).`,
      chips: ["Computer Engineering", "AI & Data Science", "E&TC Details", "Fee Structure", "Placement Stats"]
    };
  }

  // 9. HOSTEL & CAMPUS FACILITIES
  if (/(hostel|room|mess|food|stay|accommodation|wifi|gym|sports|library|canteen|cafeteria|transport|bus)/i.test(q)) {
    analytics.queriesByTopic.hostel++;
    return {
      text: `🏨 **Campus & Hostel Infrastructure at ISBM COE:**\n\n` +
            `• **Campus:** 25-Acre scenic campus located in Nande, Pashan-Sus Road, Pune (near Hinjawadi IT Park).\n` +
            `• **Hostels:** On-campus boys & girls hostels with 24x7 security, biometric access, CCTV, Wi-Fi & daily housekeeping.\n` +
            `• **Hostel Fee:** Non-AC 3-Sharing: ₹70,000/yr | AC 2-Sharing: ₹97,000/yr (includes 4 daily meals mess).\n` +
            `• **Central Library:** 45,000+ volumes, SPPU university papers, IEEE journals, and quiet study reading hall.\n` +
            `• **Sports Complex:** Cricket and football grounds, basketball court, volleyball, indoor badminton & gym.\n` +
            `• **College Bus:** Pick-up and drop bus fleet covering major routes across Pune and PCMC.`,
      chips: ["Hostel Fees", "Fee Structure", "Admissions 2026", "Helpline Number"]
    };
  }

  // 10. EVENTS & FESTS
  if (/(fest|event|cultural|techfest|orion|club|hackathon|sports meet)/i.test(q)) {
    return {
      text: `🎪 **Campus Life & Events at ISBM COE:**\n\n` +
            `• **Orion (Annual Tech & Cultural Fest):** National-level Hackathon, Robo-Wars, Project Exhibitions, Fashion Show, DJ Night.\n` +
            `• **Parakram (Annual Sports Meet):** Inter-department sports tournament in cricket, football, volleyball, chess, athletics.\n\n` +
            `🏆 **Active Student Clubs:**\n` +
            `• ISBM Coding & Hackathon Club\n` +
            `• Team ISBM Motorsports (Go-Kart & Racing)\n` +
            `• Robotics & IoT Society\n` +
            `• Rotaract Club of ISBM`,
      chips: ["Campus Facilities", "B.Tech Branches", "Admissions 2026"]
    };
  }

  // 11. CONTACT, HELPLINE & LOCATION
  if (/(contact|phone|number|email|address|location|kaha hai|reach|where is|helpline|counselor)/i.test(q)) {
    const c = kb.college.contact;
    return {
      text: `📞 **Contact & Campus Location:**\n\n` +
            `• **Institute:** **${kb.college.name}**\n` +
            `• **DTE Institute Code:** **6622**\n` +
            `• **Address:** ${kb.college.address}\n` +
            `• **Admission Helpline:** **${c.admissionHelpline}**\n` +
            `• **General Phone:** ${c.generalPhone}\n` +
            `• **Admission Email:** \`${c.admissionEmail}\`\n` +
            `• **Website:** ${kb.college.website}\n` +
            `• **Visiting Hours:** ${c.visitingHours}\n\n` +
            `👉 *You can submit your callback request directly through our in-chat inquiry form!*`,
      chips: ["Apply for Counseling", "Admissions 2026", "Fee Structure", "Check Eligibility"]
    };
  }

  // DEFAULT
  return {
    text: `I'd be glad to help you! At **${kb.college.name} (DTE Code: 6622, SPPU Affiliated)**, we offer quality engineering education, 88.6% placements, and state government scholarship benefits.\n\nWhat would you like to know more about?`,
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
              "What is the fee structure for Computer Engineering?",
              "What is the DTE Code for ISBM College of Engineering?",
              "Tell me about placements & top companies",
              "How to apply for 2026 admission?"
            ]
          });
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, gracefully switching to local knowledge engine:', geminiError.message);
      }
    }

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
    message: 'Your admission inquiry has been received! ISBM COE counseling team will call you within 24 hours.',
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

  const minRequiredPCM = cat === 'general' ? 45 : 40;
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
          chance: 'High Chance (Direct CAP Choice Code: 6622)'
        });
      } else if (percentile >= requiredCutoff - 5) {
        ambitiousBranches.push({
          code: b.code,
          name: b.name,
          cutoff: requiredCutoff,
          chance: 'Moderate Chance (Round 2/3 or Institutional Spot Round)'
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
      ? `Minimum ${minRequiredPCM}% marks in PCM is required as per DTE/AICTE norms. Please verify your marksheet.`
      : eligibleBranches.length > 0
        ? `Congratulations! You qualify for ${eligibleBranches.length} branches at ISBM College of Engineering Pune (DTE: 6622).`
        : `Your score is competitive for institutional merit rounds or later CAP spot rounds at ISBM COE. Submit an inquiry for counselor assistance.`
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
    dteCode: collegeKB.college.dteCode,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🎓 ISBM College of Engineering Chatbot Server is RUNNING!`);
  console.log(`🏛️ DTE Institute Code: 6622 | Affiliated to SPPU Pune`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📊 Admin Panel: http://localhost:${PORT}/admin.html`);
  console.log(`🤖 Free AI Mode: ${process.env.GEMINI_API_KEY ? 'Google Gemini API Active' : 'Smart Offline Knowledge Engine (Free)'}`);
  console.log(`=======================================================`);
});

module.exports = { app, server };
