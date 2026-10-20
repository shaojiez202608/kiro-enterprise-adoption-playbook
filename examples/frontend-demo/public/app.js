// Device Fleet Board - small synthetic frontend used by the browser check loop.
// Query parameter `simulate-error=1` deliberately raises a console error so the
// test suite can prove that console errors are detected.

const NOTE_MAX = 200;
const state = { devices: [], filter: 'all', notes: [] };

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export function filterDevices(devices, status) {
  return status === 'all' ? devices : devices.filter((d) => d.status === status);
}

export function validateNote(text) {
  const trimmed = (text || '').trim();
  if (trimmed.length === 0) return 'Note is required.';
  if (trimmed.length > NOTE_MAX) return `Note must be at most ${NOTE_MAX} characters.`;
  return null;
}

function renderTable() {
  const tbody = document.querySelector('#device-table tbody');
  tbody.replaceChildren();
  const rows = filterDevices(state.devices, state.filter);
  for (const d of rows) {
    const tr = el('tr');
    tr.dataset.status = d.status;
    tr.append(el('td', d.id), el('td', d.type), el('td', d.site),
      el('td', d.status, `status-${d.status}`), el('td', d.lastHeartbeat));
    tbody.append(tr);
  }
  document.getElementById('summary').textContent =
    `Showing ${rows.length} of ${state.devices.length} devices`;
}

function renderDeviceOptions() {
  const select = document.getElementById('note-device');
  select.replaceChildren(...state.devices.map((d) => {
    const opt = el('option', d.id);
    opt.value = d.id;
    return opt;
  }));
}

function renderNotes() {
  const list = document.getElementById('note-list');
  list.replaceChildren(...state.notes.map((n) => el('li', `${n.deviceId}: ${n.text}`)));
}

function onSubmit(event) {
  event.preventDefault();
  const errorBox = document.getElementById('note-error');
  const textArea = document.getElementById('note-text');
  const error = validateNote(textArea.value);
  if (error) {
    errorBox.textContent = error;
    errorBox.hidden = false;
    return;
  }
  errorBox.hidden = true;
  state.notes.push({ deviceId: document.getElementById('note-device').value, text: textArea.value.trim() });
  textArea.value = '';
  renderNotes();
}

async function init() {
  if (new URLSearchParams(window.location.search).get('simulate-error') === '1') {
    console.error('Simulated error: requested via simulate-error=1');
  }
  const response = await fetch('./data/devices.json');
  if (!response.ok) throw new Error(`Failed to load devices: HTTP ${response.status}`);
  const data = await response.json();
  state.devices = data.devices;
  document.getElementById('status-filter').addEventListener('change', (e) => {
    state.filter = e.target.value;
    renderTable();
  });
  document.getElementById('note-form').addEventListener('submit', onSubmit);
  renderDeviceOptions();
  renderTable();
  document.body.dataset.ready = 'true';
}

init().catch((err) => {
  console.error(err);
  document.getElementById('summary').textContent = 'Failed to load devices.';
});
