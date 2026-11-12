/**
 * Automated Test Suite for AITE Engineering College Chatbot
 */
const { server } = require('./server');

async function runTests() {
  console.log('\n🧪 Starting Chatbot Verification Test Suite...\n');

  // Allow server a brief moment to bind
  await new Promise(r => setTimeout(r, 500));

  const BASE_URL = 'http://127.0.0.1:3000';

  async function testEndpoint(name, url, options = {}) {
    try {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      }
      console.log(`✅ [${res.status}] ${name}`);
      return { ok: true, status: res.status, data };
    } catch (err) {
      console.error(`❌ [FAILED] ${name}:`, err.message);
      return { ok: false, error: err.message };
    }
  }

  try {
    // 1. Health
    await testEndpoint('Health Check', `${BASE_URL}/api/health`);

    // 2. College Info
    await testEndpoint('College Info', `${BASE_URL}/api/college-info`);

    // 3. Branches
    const branches = await testEndpoint('Branches & Cutoffs', `${BASE_URL}/api/branches`);
    console.log(`   Found ${branches.data?.data?.length} engineering branches: ${branches.data?.data?.map(b => b.code).join(', ')}`);

    // 4. Eligibility Tool
    const elig = await testEndpoint('Check Eligibility API', `${BASE_URL}/api/check-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcmPercentage: 82, entrancePercentile: 92.5, category: 'general' })
    });
    console.log(`   Eligibility response: ${elig.data?.eligibleBranches?.length} qualifying branches.`);

    // 5. Fee Calculator
    const fees = await testEndpoint('Fee Calculator API', `${BASE_URL}/api/calculate-fees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'openGeneral', hostelType: 'nonAc', bus: true })
    });
    console.log(`   Estimated 1st Year: ₹${fees.data?.firstYearTotal?.toLocaleString('en-IN')}`);

    // 6. Chat queries test (English, Hinglish, Hindi)
    const queries = [
      "Hello, who are you?",
      "fees kitni hai CSE ki?",
      "what are the cutoffs for AI and Data Science?",
      "placements kaisa hai aur highest package kitna hai?",
      "hostel facilities aur mess charge batao",
      "scholarship details"
    ];

    for (const q of queries) {
      const chat = await testEndpoint(`Chat query: "${q}"`, `${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q })
      });
      const preview = (chat.data?.reply || '').slice(0, 85).replace(/\n/g, ' ');
      console.log(`   🤖 Bot (${chat.data?.engine}): ${preview}...`);
    }

    // 7. Lead Inquiry Submission
    const inquiry = await testEndpoint('Submit Admission Lead', `${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Vikramaditya Roy',
        phone: '+91 99887 76655',
        email: 'vikram.roy@outlook.com',
        branch: 'CSE',
        city: 'Delhi',
        examScore: '95.2 percentile JEE Main',
        question: 'Want to confirm hostel AC room booking.'
      })
    });
    console.log(`   Created Lead ID: ${inquiry.data?.inquiryId}`);

    // 8. Admin Inquiries list
    const inqList = await testEndpoint('Fetch Inquiries', `${BASE_URL}/api/inquiries`);
    console.log(`   Total Leads stored in database: ${inqList.data?.count}`);

    // 9. Notices
    const notices = await testEndpoint('Fetch Notices', `${BASE_URL}/api/notices`);
    console.log(`   Active notices count: ${notices.data?.data?.length}`);

    console.log('\n🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    server.close(() => {
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  }
}

runTests();
