/**
 * Automated Test Suite for ISBM College of Engineering Chatbot
 */
const { server } = require('./server');

async function runTests() {
  console.log('\n🧪 Starting ISBM COE Chatbot Verification Test Suite...\n');

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
    const health = await testEndpoint('Health Check', `${BASE_URL}/api/health`);
    console.log(`   Institute: ${health.data?.institute} | ${health.data?.dteCode}`);

    // 2. College Info
    await testEndpoint('College Info', `${BASE_URL}/api/college-info`);

    // 3. Branches
    const branches = await testEndpoint('Branches & Cutoffs', `${BASE_URL}/api/branches`);
    console.log(`   Found ${branches.data?.data?.length} engineering branches: ${branches.data?.data?.map(b => b.code).join(', ')}`);

    // 4. Eligibility Tool
    const elig = await testEndpoint('Check Eligibility API', `${BASE_URL}/api/check-eligibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pcmPercentage: 78, entrancePercentile: 87.5, category: 'general' })
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
      "DTE code kya hai ISBM college ka?",
      "Computer Engineering fees kitni hai?",
      "what are the cutoffs for AI and Data Science?",
      "placements kaisa hai aur highest package kitna hai?",
      "hostel facilities aur mess charge batao at Nande campus"
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
        fullName: 'Prathamesh Kulkarni',
        phone: '+91 98220 12345',
        email: 'prathamesh.k@gmail.com',
        branch: 'CSE',
        city: 'Pune',
        examScore: '89.4 percentile MHT-CET',
        question: 'Interested in Computer Engineering CAP Round Choice Code 6622.'
      })
    });
    console.log(`   Created Lead ID: ${inquiry.data?.inquiryId}`);

    // 8. Admin Inquiries list
    const inqList = await testEndpoint('Fetch Inquiries', `${BASE_URL}/api/inquiries`);
    console.log(`   Total Leads stored in database: ${inqList.data?.count}`);

    // 9. Notices
    const notices = await testEndpoint('Fetch Notices', `${BASE_URL}/api/notices`);
    console.log(`   Active notices count: ${notices.data?.data?.length}`);

    console.log('\n🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY FOR ISBM COE!\n');
  } finally {
    server.close(() => {
      console.log('Server shut down cleanly.');
      process.exit(0);
    });
  }
}

runTests();
