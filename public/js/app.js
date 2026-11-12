/**
 * ISBM Bot - ISBM College of Engineering Virtual AI Assistant
 * Client-side Controller & Interactive UI Logic
 */

// Application State
const state = {
  history: [],
  apiKey: localStorage.getItem('isbm_gemini_key') || '',
  model: localStorage.getItem('isbm_gemini_model') || 'gemini-1.5-flash',
  ttsEnabled: localStorage.getItem('isbm_tts') === 'true',
  isListening: false,
  recognition: null
};

// DOM References
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const voiceBtn = document.getElementById('voiceBtn');
const micIcon = document.getElementById('micIcon');
const ttsIcon = document.getElementById('ttsIcon');
const ttsToggleBtn = document.getElementById('ttsToggleBtn');
const aiEngineBadge = document.getElementById('aiEngineBadge');
const aiEngineText = document.getElementById('aiEngineText');

// ==========================================
// 1. INITIALIZATION & ENGINE STATE
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateEngineBadge();
  setupVoiceRecognition();
  updateTTSButtonUI();

  // Load saved settings in modal
  const keyInput = document.getElementById('userGeminiKey');
  const modelSelect = document.getElementById('geminiModel');
  if (keyInput && state.apiKey) keyInput.value = state.apiKey;
  if (modelSelect && state.model) modelSelect.value = state.model;
});

function updateEngineBadge() {
  if (state.apiKey) {
    aiEngineBadge.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1';
    aiEngineText.innerText = `Gemini AI (${state.model})`;
  } else {
    aiEngineBadge.className = 'text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center space-x-1';
    aiEngineText.innerText = 'Smart Knowledge Engine (Free)';
  }
}

// ==========================================
// 2. CHAT SUBMISSION & API CALL
// ==========================================
async function handleChatSubmit(e) {
  if (e) e.preventDefault();

  const userText = chatInput.value.trim();
  if (!userText) return;

  // Render User Message
  renderUserMessage(userText);
  chatInput.value = '';
  chatInput.focus();

  // Add to local history
  state.history.push({ role: 'user', content: userText });

  // Show typing animation
  showTyping(true);

  try {
    const payload = {
      message: userText,
      history: state.history.slice(-8),
      apiKey: state.apiKey || undefined,
      model: state.model || undefined
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }

    const data = await response.json();
    showTyping(false);

    const botReply = data.reply || 'Sorry, could you please repeat that?';
    state.history.push({ role: 'model', content: botReply });

    // Render Bot Response
    renderBotMessage(botReply, data.suggestedQuestions || [], data.engine);

    // Read aloud if TTS is enabled
    if (state.ttsEnabled) {
      speakText(cleanTextForSpeech(botReply));
    }

  } catch (err) {
    console.error('Chat error:', err);
    showTyping(false);
    renderBotMessage(
      `⚠️ *Oops, I had a brief connection issue.* \n\nDon't worry! You can ask directly about **Fees, Cutoffs, Admissions 2026, or Placements** or call our admission desk directly at **+91 98765 43210**.`,
      ["Admissions 2026", "Fee Structure", "Placement Records", "Helpline"]
    );
  }
}

function sendQuickMessage(text) {
  chatInput.value = text;
  handleChatSubmit();
}

// ==========================================
// 3. UI RENDERING & MARKDOWN FORMATTING
// ==========================================
function renderUserMessage(text) {
  const div = document.createElement('div');
  div.className = 'flex items-start justify-end space-x-2.5 animate-fade-in';
  div.innerHTML = `
    <div class="max-w-[85%] sm:max-w-[75%] bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md shadow-brand-600/20 text-sm leading-relaxed">
      ${escapeHtml(text)}
    </div>
    <div class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 text-white text-xs border border-white/10">
      <i class="fa-solid fa-user"></i>
    </div>
  `;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function renderBotMessage(rawText, chips = [], engine = 'knowledge-engine') {
  const div = document.createElement('div');
  div.className = 'flex items-start space-x-3 animate-fade-in';

  const formattedHtml = formatMarkdown(rawText);
  const engineBadge = engine === 'gemini' 
    ? `<span class="inline-flex items-center text-[10px] text-emerald-400 font-semibold mb-1"><i class="fa-solid fa-sparkles mr-1"></i> Gemini 1.5 AI</span>`
    : `<span class="inline-flex items-center text-[10px] text-brand-300 font-semibold mb-1"><i class="fa-solid fa-building-columns mr-1"></i> ISBM COE Official Portal (DTE: 6622)</span>`;

  // Chips HTML
  let chipsHtml = '';
  if (Array.isArray(chips) && chips.length > 0) {
    chipsHtml = `
      <div class="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-white/5">
        ${chips.map(chip => `
          <button onclick="sendQuickMessage('${escapeQuotes(chip)}')" class="text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-brand-600 hover:text-white text-slate-300 border border-white/10 transition-all flex items-center space-x-1">
            <span>${escapeHtml(chip)}</span>
            <i class="fa-solid fa-arrow-right text-[9px] opacity-60"></i>
          </button>
        `).join('')}
      </div>
    `;
  }

  // Audio Read aloud button
  const audioBtnHtml = `
    <button onclick="speakText('${escapeQuotes(cleanTextForSpeech(rawText))}')" title="Listen to this answer" class="mt-2 text-[11px] text-slate-400 hover:text-white inline-flex items-center space-x-1 transition-colors">
      <i class="fa-solid fa-volume-high text-[10px]"></i>
      <span>Listen</span>
    </button>
  `;

  div.innerHTML = `
    <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs shadow-md shadow-brand-600/30">
      <i class="fa-solid fa-robot"></i>
    </div>
    <div class="max-w-[88%] sm:max-w-[80%]">
      <div class="glass-card bg-slate-900/85 rounded-2xl rounded-tl-sm p-4 text-slate-200 prose-chat border border-white/10 shadow-lg">
        ${engineBadge}
        <div>${formattedHtml}</div>
      </div>
      <div class="flex items-center justify-between px-1">
        ${audioBtnHtml}
      </div>
      ${chipsHtml}
    </div>
  `;

  chatMessages.appendChild(div);
  scrollToBottom();
}

function showTyping(show) {
  if (show) {
    typingIndicator.classList.remove('hidden');
    scrollToBottom();
  } else {
    typingIndicator.classList.add('hidden');
  }
}

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Markdown Formatter (Bold, lists, tables, links, code)
function formatMarkdown(text) {
  if (!text) return '';

  let html = text;

  // Escape basic HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Tables
  if (html.includes('|')) {
    html = renderMarkdownTable(html);
  }

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italics *text*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Inline Code `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet lines • or * or -
  html = html.replace(/^[\*\-•]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Convert double linebreaks to paragraphs
  html = html
    .split(/\n\n+/)
    .map(p => {
      p = p.trim();
      if (!p) return '';
      if (p.startsWith('<ul>') || p.startsWith('<table>') || p.startsWith('<div')) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return html;
}

function renderMarkdownTable(text) {
  const lines = text.split('\n');
  let inTable = false;
  let tableLines = [];
  let result = [];

  for (let line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      tableLines.push(line.trim());
    } else {
      if (inTable) {
        result.push(parseTableRows(tableLines));
        inTable = false;
        tableLines = [];
      }
      result.push(line);
    }
  }

  if (inTable && tableLines.length > 0) {
    result.push(parseTableRows(tableLines));
  }

  return result.join('\n');
}

function parseTableRows(rows) {
  if (rows.length < 2) return rows.join('\n');

  let tableHtml = '<div class="overflow-x-auto my-2"><table class="w-full text-left">';
  
  // Header
  const headerCells = rows[0].split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
  tableHtml += `<thead><tr>${headerCells}</tr></thead><tbody>`;

  // Rows (skip separator row at index 1)
  for (let i = 2; i < rows.length; i++) {
    const rowCells = rows[i].split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
    tableHtml += `<tr>${rowCells}</tr>`;
  }

  tableHtml += '</tbody></table></div>';
  return tableHtml;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeQuotes(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function cleanTextForSpeech(text) {
  return text
    .replace(/[#*`_~|]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/http\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// 4. SPEECH RECOGNITION (VOICE INPUT)
// ==========================================
function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.log('Web Speech API is not supported in this browser.');
    voiceBtn.title = 'Voice input not supported in your browser';
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = false;
  state.recognition.lang = 'en-IN'; // Indian English / Hindi friendly

  state.recognition.onstart = () => {
    state.isListening = true;
    voiceBtn.classList.add('listening-active');
    micIcon.className = 'fa-solid fa-microphone-lines text-white animate-pulse';
    chatInput.placeholder = 'Listening... Speak now!';
  };

  state.recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    handleChatSubmit();
  };

  state.recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopListening();
  };

  state.recognition.onend = () => {
    stopListening();
  };
}

function toggleVoiceRecognition() {
  if (!state.recognition) {
    alert('Voice recognition is supported in Google Chrome, Microsoft Edge, and modern Chromium browsers.');
    return;
  }

  if (state.isListening) {
    state.recognition.stop();
    stopListening();
  } else {
    try {
      state.recognition.start();
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  }
}

function stopListening() {
  state.isListening = false;
  voiceBtn.classList.remove('listening-active');
  micIcon.className = 'fa-solid fa-microphone';
  chatInput.placeholder = 'Ask anything about fees, cutoffs, placements, admissions...';
}

// ==========================================
// 5. TEXT-TO-SPEECH (VOICE OUTPUT)
// ==========================================
function toggleTTS() {
  state.ttsEnabled = !state.ttsEnabled;
  localStorage.setItem('isbm_tts', state.ttsEnabled);
  updateTTSButtonUI();

  if (!state.ttsEnabled && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function updateTTSButtonUI() {
  if (state.ttsEnabled) {
    ttsIcon.className = 'fa-solid fa-volume-high text-brand-400';
    ttsToggleBtn.classList.add('border-brand-500/50', 'bg-brand-500/10');
  } else {
    ttsIcon.className = 'fa-solid fa-volume-xmark text-slate-400';
    ttsToggleBtn.classList.remove('border-brand-500/50', 'bg-brand-500/10');
  }
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.slice(0, 350));
  utterance.lang = 'en-IN';
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ==========================================
// 6. INTERACTIVE TOOLS: ELIGIBILITY & FEES
// ==========================================
async function checkEligibility(e) {
  e.preventDefault();
  const pcm = document.getElementById('pcmScore').value;
  const percentile = document.getElementById('entrancePercentile').value;
  const category = document.getElementById('applicantCategory').value;
  const container = document.getElementById('eligibilityResults');

  container.classList.remove('hidden');
  container.innerHTML = `<div class="text-center py-4 text-xs text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Analyzing cutoff data...</div>`;

  try {
    const res = await fetch('/api/check-eligibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcmPercentage: pcm, entrancePercentile: percentile, category })
    });

    const data = await res.json();

    let branchesList = '';
    if (data.eligibleBranches && data.eligibleBranches.length > 0) {
      branchesList = `
        <div class="mb-3">
          <p class="text-xs font-bold text-emerald-400 mb-1.5 flex items-center">
            <i class="fa-solid fa-circle-check mr-1.5"></i> High Chance of Allotment in CAP:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${data.eligibleBranches.map(b => `
              <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 text-xs">
                <span class="font-bold text-white">${b.name} (${b.code})</span>
                <span class="block text-[11px] text-emerald-300 mt-0.5">Cutoff benchmark: ${b.cutoff}%ile</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    let ambitiousList = '';
    if (data.ambitiousBranches && data.ambitiousBranches.length > 0) {
      ambitiousList = `
        <div class="mb-3">
          <p class="text-xs font-bold text-amber-400 mb-1.5 flex items-center">
            <i class="fa-solid fa-clock-rotate-left mr-1.5"></i> Moderate / Spot Round Chance:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            ${data.ambitiousBranches.map(b => `
              <div class="bg-amber-950/30 border border-amber-500/30 rounded-lg p-2.5 text-xs">
                <span class="font-bold text-white">${b.name} (${b.code})</span>
                <span class="block text-[11px] text-amber-300 mt-0.5">Cutoff benchmark: ${b.cutoff}%ile</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-3">
        <div class="flex items-center justify-between border-b border-white/10 pb-2">
          <span class="text-xs text-slate-300">12th PCM Status:</span>
          <span class="text-xs font-bold ${data.is12thEligible ? 'text-emerald-400' : 'text-red-400'}">
            ${data.is12thEligible ? '✅ Eligible (>= ' + data.minRequiredPCM + '%)' : '❌ Ineligible (< ' + data.minRequiredPCM + '%)'}
          </span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">${data.recommendation}</p>
        ${branchesList}
        ${ambitiousList}
        <div class="pt-2 text-center">
          <button onclick="closeModal('eligibilityModal'); openModal('inquiryModal')" class="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors">
            Connect with Admission Officer for Confirmation
          </button>
        </div>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-400">Failed to evaluate eligibility. Please try again.</p>`;
  }
}

async function calculateFees(e) {
  e.preventDefault();
  const category = document.getElementById('feeCategory').value;
  const hostel = document.getElementById('feeHostel').value;
  const bus = document.getElementById('feeBus').checked;
  const container = document.getElementById('feeResults');

  container.classList.remove('hidden');
  container.innerHTML = `<div class="text-center py-4 text-xs text-slate-400"><i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Calculating fee structure...</div>`;

  try {
    const res = await fetch('/api/calculate-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, hostelType: hostel, bus })
    });

    const d = await res.json();

    container.innerHTML = `
      <div class="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-2.5 text-xs">
        <h4 class="font-bold text-white text-sm border-b border-white/10 pb-2 flex items-center justify-between">
          <span>Investment Summary</span>
          <span class="text-accent-400 text-base">₹${d.firstYearTotal.toLocaleString('en-IN')} / 1st Year</span>
        </h4>
        <div class="flex justify-between text-slate-300">
          <span>Academic Tuition & Development Fee:</span>
          <span class="font-semibold text-white">₹${d.academicFeeAnnual.toLocaleString('en-IN')}</span>
        </div>
        <div class="flex justify-between text-slate-300">
          <span>Hostel & Mess (4 Meals/Day):</span>
          <span class="font-semibold text-white">₹${d.hostelFeeAnnual.toLocaleString('en-IN')}</span>
        </div>
        ${d.cautionDepositRefundable > 0 ? `
          <div class="flex justify-between text-slate-400 text-[11px]">
            <span>Refundable Caution Deposit (One-time):</span>
            <span>₹${d.cautionDepositRefundable.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        ${d.busTransportAnnual > 0 ? `
          <div class="flex justify-between text-slate-300">
            <span>City AC Bus Transportation:</span>
            <span class="font-semibold text-white">₹${d.busTransportAnnual.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="pt-2 border-t border-white/10 flex justify-between items-center text-slate-200">
          <span class="font-semibold">Estimated 4-Year Complete Degree Cost:</span>
          <span class="font-bold text-emerald-400 text-sm">₹${d.estimatedFourYearTotal.toLocaleString('en-IN')}</span>
        </div>
        <p class="text-[10px] text-slate-500 pt-1">
          *Govt scholarships (MahaDBT/NSP/EBC) are directly credited to eligible students' bank accounts.
        </p>
      </div>
    `;

  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-400">Failed to calculate fees. Please try again.</p>`;
  }
}

// ==========================================
// 7. ADMISSION CALL-BACK / INQUIRY LEAD
// ==========================================
async function submitInquiry(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitLeadBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Submitting...`;

  const payload = {
    fullName: document.getElementById('inqName').value,
    phone: document.getElementById('inqPhone').value,
    email: document.getElementById('inqEmail').value,
    branch: document.getElementById('inqBranch').value,
    city: document.getElementById('inqCity').value,
    examScore: document.getElementById('inqScore').value,
    question: document.getElementById('inqQuestion').value
  };

  try {
    const res = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      alert(`🎉 Thank you, ${payload.fullName}!\n\nYour inquiry ID is ${data.inquiryId}.\nOur counseling team will contact you on ${payload.phone} shortly!`);
      closeModal('inquiryModal');
      document.getElementById('leadInquiryForm').reset();
      
      // Post notice into chat thread
      renderBotMessage(
        `✅ **Admission Counseling Request Logged!**\n\nHi **${payload.fullName}**, we have assigned counselor inquiry reference **${data.inquiryId}**. Our department team will assist you with branch cutoffs, counseling forms, and campus visits.`,
        ["Hostel Facilities", "Fee Structure", "Placement Stats"]
      );
    } else {
      alert(data.error || 'Failed to submit inquiry.');
    }
  } catch (err) {
    alert('Network error while submitting inquiry. Please call +91 98765 43210.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span>Submit Call-Back Request</span> <i class="fa-solid fa-paper-plane text-xs ml-1"></i>`;
  }
}

// ==========================================
// 8. SETTINGS & EXPORT CHAT
// ==========================================
function saveApiSettings() {
  const key = document.getElementById('userGeminiKey').value.trim();
  const model = document.getElementById('geminiModel').value;

  state.apiKey = key;
  state.model = model;

  localStorage.setItem('isbm_gemini_key', key);
  localStorage.setItem('isbm_gemini_model', model);

  updateEngineBadge();
  closeModal('settingsModal');

  if (key) {
    alert('✅ Free Gemini AI API Key saved successfully! ISBM Bot will now use Google Gemini AI.');
  } else {
    alert('ℹ️ Gemini API Key cleared. ISBM Bot will use the built-in Smart College Knowledge Engine.');
  }
}

function clearApiSettings() {
  localStorage.removeItem('isbm_gemini_key');
  document.getElementById('userGeminiKey').value = '';
  state.apiKey = '';
  updateEngineBadge();
  alert('API settings reset.');
}

function exportChat() {
  if (state.history.length === 0) {
    alert('No chat messages to export yet.');
    return;
  }

  let text = `========================================================\n`;
  text += `ISBM COLLEGE OF ENGINEERING (ISBM COE PUNE)\n`;
  text += `DTE Code: 6622 | Affiliated to Savitribai Phule Pune University\n`;
  text += `ISBM Bot - Admission & Student AI Chat Transcript\n`;
  text += `Exported on: ${new Date().toLocaleString()}\n`;
  text += `========================================================\n\n`;

  state.history.forEach((m, idx) => {
    const roleName = m.role === 'user' ? 'STUDENT' : 'ISBM BOT (AI ASSISTANT)';
    text += `[${idx + 1}] ${roleName}:\n${m.content}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ISBM_COE_Chat_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearChat() {
  if (confirm('Are you sure you want to clear this conversation?')) {
    state.history = [];
    // Reset to welcome content
    location.reload();
  }
}

// Modal Helpers
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
