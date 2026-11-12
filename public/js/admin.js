/**
 * AITE Admin Portal JavaScript Controller
 */

let allInquiries = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchAdminData();
});

async function fetchAdminData() {
  await Promise.all([
    fetchAnalytics(),
    fetchInquiries(),
    fetchNotices()
  ]);
}

async function fetchAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const json = await res.json();
    if (json.success) {
      const d = json.data;
      document.getElementById('metricTotalInquiries').innerText = d.totalInquiries || 0;
      document.getElementById('metricPendingInquiries').innerText = d.pendingInquiries || 0;
      document.getElementById('metricTotalQueries').innerText = d.totalQueries || 0;
    }
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
  }
}

async function fetchInquiries() {
  const tbody = document.getElementById('inquiriesTableBody');
  try {
    const res = await fetch('/api/inquiries');
    const json = await res.json();
    if (json.success) {
      allInquiries = json.data || [];
      renderInquiries(allInquiries);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-red-400">Error loading inquiries.</td></tr>`;
  }
}

function renderInquiries(list) {
  const tbody = document.getElementById('inquiriesTableBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No student leads recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => {
    let statusClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    if (item.status === 'Contacted') statusClass = 'bg-brand-500/15 text-brand-400 border border-brand-500/30';
    if (item.status === 'Admitted') statusClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (item.status === 'Closed') statusClass = 'bg-slate-700 text-slate-300';

    return `
      <tr class="hover:bg-slate-900/60 transition-colors">
        <td class="py-3 px-3">
          <p class="font-bold text-white">${escapeHtml(item.fullName)}</p>
          <p class="text-[11px] text-slate-400">${item.city || 'N/A'}</p>
        </td>
        <td class="py-3 px-3">
          <p class="text-slate-200">${escapeHtml(item.phone)}</p>
          <p class="text-[11px] text-slate-400">${escapeHtml(item.email || 'N/A')}</p>
        </td>
        <td class="py-3 px-3">
          <span class="inline-block px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 font-semibold text-[11px]">${item.branch}</span>
          <p class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(item.examScore || 'N/A')}</p>
        </td>
        <td class="py-3 px-3">
          <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusClass}">
            ${item.status}
          </span>
        </td>
        <td class="py-3 px-3 text-right">
          <select onchange="updateInquiryStatus('${item.id}', this.value)" class="bg-slate-900 border border-white/10 rounded px-2 py-1 text-[11px] text-slate-300 outline-none">
            <option value="Pending" ${item.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Contacted" ${item.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Admitted" ${item.status === 'Admitted' ? 'selected' : ''}>Admitted</option>
            <option value="Closed" ${item.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

function filterInquiries() {
  const branch = document.getElementById('branchFilter').value;
  if (branch === 'ALL') {
    renderInquiries(allInquiries);
  } else {
    const filtered = allInquiries.filter(i => (i.branch || '').toUpperCase().includes(branch));
    renderInquiries(filtered);
  }
}

async function updateInquiryStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await fetchAnalytics();
      const item = allInquiries.find(x => x.id === id);
      if (item) item.status = newStatus;
      filterInquiries();
    }
  } catch (err) {
    alert('Failed to update status.');
  }
}

function exportLeadsCSV() {
  if (allInquiries.length === 0) {
    alert('No inquiries to export.');
    return;
  }

  let csv = 'ID,Full Name,Phone,Email,Branch,Score,City,Status,Question,Timestamp\n';
  allInquiries.forEach(i => {
    csv += `"${i.id}","${escapeCsv(i.fullName)}","${escapeCsv(i.phone)}","${escapeCsv(i.email)}","${escapeCsv(i.branch)}","${escapeCsv(i.examScore)}","${escapeCsv(i.city)}","${i.status}","${escapeCsv(i.question)}","${i.timestamp}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AITE_Admission_Leads_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// NOTICES MANAGEMENT
// ==========================================
async function fetchNotices() {
  const container = document.getElementById('noticesList');
  try {
    const res = await fetch('/api/notices');
    const json = await res.json();
    if (json.success) {
      const list = json.data || [];
      container.innerHTML = list.map(n => `
        <div class="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300">${n.category}</span>
            <span class="text-[10px] text-slate-500">${n.date}</span>
          </div>
          <p class="text-xs font-semibold text-white leading-tight">${escapeHtml(n.title)}</p>
          <p class="text-[11px] text-slate-400 line-clamp-2">${escapeHtml(n.summary)}</p>
        </div>
      `).join('');
    }
  } catch (err) {
    container.innerHTML = `<p class="text-xs text-red-400">Failed to load notices.</p>`;
  }
}

async function postNotice(e) {
  e.preventDefault();
  const title = document.getElementById('noticeTitle').value;
  const category = document.getElementById('noticeCategory').value;
  const summary = document.getElementById('noticeSummary').value;
  const pinned = document.getElementById('noticePinned').checked;

  try {
    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, summary, pinned })
    });
    if (res.ok) {
      alert('✅ Notice published successfully!');
      document.getElementById('noticeForm').reset();
      fetchNotices();
    }
  } catch (err) {
    alert('Failed to publish notice.');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeCsv(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '""').replace(/\n/g, ' ');
}
