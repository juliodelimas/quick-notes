/* ── State ── */
const state = {
  token: localStorage.getItem('qn_token') || null,
  user: JSON.parse(localStorage.getItem('qn_user') || 'null'),
  notes: [],
  activeNoteId: null,
  filterTag: null,
  randomNote: null,
};

/* ── API helper ── */
async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (state.token) opts.headers['Authorization'] = `Bearer ${state.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

/* ── DOM shortcuts ── */
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove('hidden');
const hide = (id) => $(id).classList.add('hidden');
const setError = (id, msg) => { $(id).textContent = msg; };

/* ── Auth ── */
function initAuth() {
  // Tab switching
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      if (tab === 'login') { show('login-form'); hide('register-form'); }
      else { hide('login-form'); show('register-form'); }
    });
  });

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('login-error', '');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const data = await api('POST', '/auth/login', {
        email: $('login-email').value.trim(),
        password: $('login-password').value,
      });
      saveSession(data);
      enterApp();
    } catch (err) {
      setError('login-error', err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setError('register-error', '');
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const data = await api('POST', '/auth/register', {
        name: $('reg-name').value.trim(),
        email: $('reg-email').value.trim(),
        password: $('reg-password').value,
      });
      saveSession(data);
      enterApp();
    } catch (err) {
      setError('register-error', err.message);
    } finally {
      btn.disabled = false;
    }
  });
}

function saveSession({ token, user }) {
  state.token = token;
  state.user = user;
  localStorage.setItem('qn_token', token);
  localStorage.setItem('qn_user', JSON.stringify(user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('qn_token');
  localStorage.removeItem('qn_user');
}

/* ── App Shell ── */
function enterApp() {
  hide('auth-screen');
  show('app-screen');
  $('user-name').textContent = `Hi, ${state.user.name}`;
  loadNotes();
}

function logout() {
  clearSession();
  state.notes = [];
  state.activeNoteId = null;
  state.filterTag = null;
  hide('app-screen');
  show('auth-screen');
  hide('editor-panel');
}

/* ── Notes ── */
async function loadNotes() {
  try {
    const url = state.filterTag ? `/notes?tag=${encodeURIComponent(state.filterTag)}` : '/notes';
    state.notes = await api('GET', url);
    renderNotesList();
    renderTagCloud();
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authentication')) logout();
  }
}

function renderNotesList() {
  const list = $('notes-list');
  list.innerHTML = '';

  const filtered = state.notes;
  if (filtered.length === 0) {
    show('empty-msg');
    return;
  }
  hide('empty-msg');

  filtered.forEach((n) => {
    const card = document.createElement('div');
    card.className = 'note-card' + (n._id === state.activeNoteId ? ' active' : '');
    card.dataset.id = n._id;

    const preview = n.note;
    const date = new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const tagHtml = n.tags.slice(0, 3).map((t) => `<span class="tag">${escHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="note-card-preview">${escHtml(preview)}</div>
      <div class="note-card-meta">
        <div class="tag-cloud">${tagHtml}</div>
        <span class="note-card-date">${date}</span>
      </div>`;

    card.addEventListener('click', () => openEditor(n._id));
    list.appendChild(card);
  });
}

function renderTagCloud() {
  const all = new Set();
  state.notes.forEach((n) => n.tags.forEach((t) => all.add(t)));

  const container = $('tag-list');
  container.innerHTML = '';

  all.forEach((tag) => {
    const btn = document.createElement('span');
    btn.className = 'tag' + (tag === state.filterTag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => toggleTagFilter(tag));
    container.appendChild(btn);
  });
}

function toggleTagFilter(tag) {
  state.filterTag = state.filterTag === tag ? null : tag;
  if (state.filterTag) show('clear-filter-btn');
  else hide('clear-filter-btn');
  loadNotes();
}

/* ── Editor ── */
function openEditor(noteId) {
  state.activeNoteId = noteId;
  const note = state.notes.find((n) => n._id === noteId);
  if (!note) return;

  $('editor-title').textContent = 'Edit Note';
  $('note-content').value = note.note;
  $('note-tags').value = note.tags.join(', ');
  setError('editor-error', '');
  show('delete-note-btn');
  show('editor-panel');

  renderNotesList(); // update active state
}

function openNewEditor() {
  state.activeNoteId = null;
  $('editor-title').textContent = 'New Note';
  $('note-content').value = '';
  $('note-tags').value = '';
  setError('editor-error', '');
  hide('delete-note-btn');
  show('editor-panel');

  document.querySelectorAll('.note-card').forEach((c) => c.classList.remove('active'));
  $('note-content').focus();
}

function closeEditor() {
  state.activeNoteId = null;
  hide('editor-panel');
  document.querySelectorAll('.note-card').forEach((c) => c.classList.remove('active'));
}

async function saveNote() {
  const content = $('note-content').value.trim();
  if (!content) { setError('editor-error', 'Note cannot be empty'); return; }

  const tags = $('note-tags').value
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  setError('editor-error', '');
  const btn = $('save-note-btn');
  btn.disabled = true;

  try {
    if (state.activeNoteId) {
      await api('PUT', `/notes/${state.activeNoteId}`, { note: content, tags });
    } else {
      await api('POST', '/notes', { note: content, tags });
    }
    await loadNotes();
    closeEditor();
  } catch (err) {
    setError('editor-error', err.message);
  } finally {
    btn.disabled = false;
  }
}

async function deleteNote() {
  if (!state.activeNoteId) return;
  if (!confirm('Delete this note? This cannot be undone.')) return;

  try {
    await api('DELETE', `/notes/${state.activeNoteId}`);
    closeEditor();
    await loadNotes();
  } catch (err) {
    setError('editor-error', err.message);
  }
}

/* ── Random Note ── */
async function showRandomNote() {
  try {
    const note = await api('GET', '/notes/random');
    state.randomNote = note;
    $('random-note-text').textContent = note.note;
    $('random-note-tags').innerHTML = note.tags.map((t) => `<span class="tag">${escHtml(t)}</span>`).join('');
    show('random-modal');
  } catch (err) {
    alert(err.message === 'No notes found' ? 'You have no notes yet!' : err.message);
  }
}

function closeModal() {
  hide('random-modal');
  state.randomNote = null;
}

function editRandomNote() {
  if (!state.randomNote) return;
  closeModal();
  const existing = state.notes.find((n) => n._id === state.randomNote._id);
  if (existing) {
    openEditor(state.randomNote._id);
  } else {
    loadNotes().then(() => openEditor(state.randomNote._id));
  }
}

/* ── Utils ── */
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Event Wiring ── */
function wireEvents() {
  $('logout-btn').addEventListener('click', logout);
  $('new-note-btn').addEventListener('click', openNewEditor);
  $('close-editor-btn').addEventListener('click', closeEditor);
  $('save-note-btn').addEventListener('click', saveNote);
  $('delete-note-btn').addEventListener('click', deleteNote);
  $('random-btn').addEventListener('click', showRandomNote);
  $('close-modal-btn').addEventListener('click', closeModal);
  $('another-random-btn').addEventListener('click', showRandomNote);
  $('edit-random-btn').addEventListener('click', editRandomNote);
  $('clear-filter-btn').addEventListener('click', () => { state.filterTag = null; hide('clear-filter-btn'); loadNotes(); });

  $('random-modal').addEventListener('click', (e) => { if (e.target === $('random-modal')) closeModal(); });

  // Ctrl+S / Cmd+S to save
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!$('editor-panel').classList.contains('hidden')) saveNote();
    }
    if (e.key === 'Escape') {
      if (!$('random-modal').classList.contains('hidden')) closeModal();
      else closeEditor();
    }
  });
}

/* ── Boot ── */
function boot() {
  initAuth();
  wireEvents();

  if (state.token && state.user) {
    enterApp();
  } else {
    show('auth-screen');
  }
}

document.addEventListener('DOMContentLoaded', boot);
