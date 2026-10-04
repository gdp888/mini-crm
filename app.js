// Мини CRM — хранение в localStorage, таблица клиентов
const STORAGE_KEY = 'mini-crm-clients';

let clients = load();
let editingId = null;
let sortKey = null;
let sortAsc = true;

const $ = (s) => document.querySelector(s);
const tbody = $('#tbody');
const modal = $('#modal');
const form = $('#form');

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const STATUS = {
  new:    { label: 'Новый',    cls: 'badge-new' },
  active: { label: 'Активный', cls: 'badge-active' },
  closed: { label: 'Закрытый', cls: 'badge-closed' },
};

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  let list = clients.filter(c =>
    !q || [c.name, c.phone, c.email, c.note].some(v => (v || '').toLowerCase().includes(q))
  );

  if (sortKey) {
    list = [...list].sort((a, b) => {
      const va = (a[sortKey] || '').toString().toLowerCase();
      const vb = (b[sortKey] || '').toString().toLowerCase();
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.phone)}</td>
      <td>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</td>
      <td><span class="badge ${STATUS[c.status]?.cls}">${STATUS[c.status]?.label || c.status}</span></td>
      <td>${esc(c.note)}</td>
      <td class="actions">
        <button class="btn" data-edit="${c.id}">✏️</button>
        <button class="btn btn-danger" data-del="${c.id}">🗑</button>
      </td>
    </tr>`).join('');

  $('#empty').classList.toggle('hidden', list.length > 0);

  // статистика
  $('#totalCount').textContent = clients.length;
  $('#newCount').textContent = clients.filter(c => c.status === 'new').length;
  $('#activeCount').textContent = clients.filter(c => c.status === 'active').length;
  $('#closedCount').textContent = clients.filter(c => c.status === 'closed').length;
}

// ---- модальное окно ----
function openModal(client) {
  editingId = client ? client.id : null;
  $('#modalTitle').textContent = client ? 'Редактировать клиента' : 'Новый клиент';
  form.name.value  = client?.name  || '';
  form.phone.value = client?.phone || '';
  form.email.value = client?.email || '';
  form.status.value = client?.status || 'new';
  form.note.value  = client?.note  || '';
  modal.classList.remove('hidden');
  form.name.focus();
}
function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim(),
    email: form.email.value.trim(),
    status: form.status.value,
    note: form.note.value.trim(),
  };
  if (!data.name) return;

  if (editingId) {
    const c = clients.find(x => x.id === editingId);
    Object.assign(c, data);
  } else {
    clients.push({ id: uid(), createdAt: Date.now(), ...data });
  }
  save(); render(); closeModal();
});

// ---- делегирование кликов по таблице ----
tbody.addEventListener('click', (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if (editId) openModal(clients.find(c => c.id === editId));
  if (delId) {
    const c = clients.find(x => x.id === delId);
    if (confirm(`Удалить клиента «${c.name}»?`)) {
      clients = clients.filter(x => x.id !== delId);
      save(); render();
    }
  }
});

// ---- сортировка ----
document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = true; }
    render();
  });
});

// ---- экспорт CSV ----
$('#exportBtn').addEventListener('click', () => {
  const rows = [['Имя','Телефон','Email','Статус','Примечание']]
    .concat(clients.map(c => [c.name, c.phone, c.email, STATUS[c.status]?.label || c.status, c.note]));
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'clients.csv';
  a.click();
});

// ---- прочие обработчики ----
$('#addBtn').addEventListener('click', () => openModal(null));
$('#cancelBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
$('#search').addEventListener('input', render);

render();
