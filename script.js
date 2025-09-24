
let vault = JSON.parse(localStorage.getItem('vaultData')) || [];
let editingIndex = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');
  if (id === 'dashboard') renderVault();
}

document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// Password generator
function generateNewPassword() {
  const length = parseInt(document.getElementById('lengthSlider').value);
  const includeNumbers = document.getElementById('includeNumbers').checked;
  const includeSymbols = document.getElementById('includeSymbols').checked;
  const includeUppercase = document.getElementById('includeUppercase').checked;

  let chars = 'abcdefghijklmnopqrstuvwxyz';
  if (includeUppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (includeNumbers) chars += '0123456789';
  if (includeSymbols) chars += '!@#$%^&*()_+[]{}<>?';

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  document.getElementById('genPassword').value = password;
}

function copyGeneratedPassword() {
  const password = document.getElementById('genPassword').value;
  navigator.clipboard.writeText(password).then(() => {
    alert('Password copied to clipboard!');
  });
}

// Toast feedback
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'success') toast.style.background = 'var(--success)';
  else if (type === 'danger') toast.style.background = 'var(--danger)';
  else toast.style.background = 'var(--accent)';
  setTimeout(() => {
    toast.className = 'toast';
  }, 2000);
}

// Add or edit password
document.getElementById('addPasswordForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const now = Date.now();
  const entry = {
    site: document.getElementById('appName').value,
    username: document.getElementById('email').value,
    password: document.getElementById('genPassword').value,
    notes: document.getElementById('notes').value,
    createdAt: now,
    modifiedAt: now
  };
  if (editingIndex !== null) {
    entry.createdAt = vault[editingIndex].createdAt || now;
    entry.modifiedAt = now;
    vault[editingIndex] = entry;
    editingIndex = null;
    showToast('Password updated!', 'success');
  } else {
    vault.push(entry);
    showToast('Password saved!', 'success');
  }
  localStorage.setItem('vaultData', JSON.stringify(vault));
  renderVault();
  showScreen('dashboard');
  e.target.reset();
});

// Sorting logic
function getSortedVault(list) {
  const sortValue = document.getElementById('sortSelect').value;
  let sorted = [...list];
  if (sortValue === 'az') {
    sorted.sort((a, b) => a.site.localeCompare(b.site));
  } else if (sortValue === 'recent') {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortValue === 'modified') {
    sorted.sort((a, b) => b.modifiedAt - a.modifiedAt);
  }
  return sorted;
}

// Render vault history
function renderVault(filteredVault) {
  const container = document.getElementById('vaultCards');
  container.innerHTML = '';
  const list = filteredVault || vault;
  const sortedList = getSortedVault(list);
  if (sortedList.length === 0) {
    container.innerHTML = '<p style="text-align:center;color:#888;">No saved passwords yet.</p>';
    return;
  }
  sortedList.forEach((entry, index) => {
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.innerHTML = `
      <div>
        <strong>${entry.site}</strong><br/>
        <span style="color:var(--accent);font-size:1.05em;">👤 ${entry.username}</span><br/>
        🔐 <span id="pwd-${index}">••••••••</span>
      </div>
      <div class="card-actions">
        <button aria-label="Show/Hide Password" onclick="togglePwd(${index}, '${entry.password}')">👁</button>
        <button aria-label="Copy Password" onclick="copyPwd('${entry.password}')">📋</button>
        <button aria-label="Edit Entry" onclick="editEntry(${vault.indexOf(entry)})">✏️</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function editEntry(index) {
  editingIndex = index;
  const entry = vault[index];
  document.getElementById('appName').value = entry.site;
  document.getElementById('email').value = entry.username;
  document.getElementById('genPassword').value = entry.password;
  document.getElementById('notes').value = entry.notes || '';
  showScreen('addPasswordScreen');
}

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    const term = this.value.trim().toLowerCase();
    const filtered = vault.filter(entry =>
      entry.site.toLowerCase().includes(term) ||
      entry.username.toLowerCase().includes(term) ||
      (entry.notes && entry.notes.toLowerCase().includes(term))
    );
    renderVault(filtered);
  });
}

// Sort functionality
const sortSelect = document.getElementById('sortSelect');
if (sortSelect) {
  sortSelect.addEventListener('change', function() {
    renderVault();
  });
}

function togglePwd(index, realPwd) {
  navigator.clipboard.writeText(password).then(() => {
    showToast('Password copied!', 'success');
  });
}

function copyPwd(password) {
  navigator.clipboard.writeText(password).then(() => {
    showToast('Password copied!', 'success');
  });
}

// Update slider value display for password length
const lengthSlider = document.getElementById('lengthSlider');
const sliderValue = document.getElementById('sliderValue');
if (lengthSlider && sliderValue) {
  const min = parseInt(lengthSlider.min);
  const max = parseInt(lengthSlider.max);
  const minWidth = 64; // px
  const maxWidth = 160; // px
  const updateSliderValue = () => {
    sliderValue.textContent = lengthSlider.value;
    // Calculate thumb width based on value
    const val = parseInt(lengthSlider.value);
    const width = minWidth + ((val - min) / (max - min)) * (maxWidth - minWidth);
    lengthSlider.style.setProperty('--thumb-width', width + 'px');
    // Calculate progress percent for track fill
    const percent = ((val - min) / (max - min)) * 100;
    lengthSlider.style.setProperty('--slider-progress', percent + '%');
  };
  lengthSlider.addEventListener('input', updateSliderValue);
  updateSliderValue();
}

// --- Master Password Security ---
const MASTER_KEY = 'unipass_master_hash';
const SESSION_KEY = 'unipass_session';
let sessionTimeout = null;
const SESSION_DURATION = 5 * 60 * 1000; // 5 minutes

function sha256(str) {
  // Simple SHA-256 hash using SubtleCrypto
  const encoder = new TextEncoder();
  return window.crypto.subtle.digest('SHA-256', encoder.encode(str)).then(buf => {
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  });
}

function showMasterPasswordModal(setup = false) {
  const modal = document.getElementById('masterPasswordModal');
  const form = document.getElementById('masterPasswordForm');
  const input = document.getElementById('masterPasswordInput');
  const confirm = document.getElementById('masterPasswordConfirm');
  const error = document.getElementById('masterPasswordError');
  const submitBtn = document.getElementById('masterPasswordSubmit');
  error.textContent = '';
  input.value = '';
  confirm.value = '';
  if (setup) {
    confirm.style.display = '';
    submitBtn.textContent = 'Set Master Password';
    input.placeholder = 'Create master password';
    confirm.placeholder = 'Confirm master password';
  } else {
    confirm.style.display = 'none';
    submitBtn.textContent = 'Unlock';
    input.placeholder = 'Enter master password';
  }
  modal.classList.remove('hidden');
  input.focus();
}

function hideMasterPasswordModal() {
  document.getElementById('masterPasswordModal').classList.add('hidden');
}

function isMasterPasswordSet() {
  return !!localStorage.getItem(MASTER_KEY);
}

function setSession() {
  localStorage.setItem(SESSION_KEY, '1');
  resetSessionTimeout();
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function isSessionActive() {
  return !!localStorage.getItem(SESSION_KEY);
}

function resetSessionTimeout() {
  if (sessionTimeout) clearTimeout(sessionTimeout);
  sessionTimeout = setTimeout(() => {
    clearSession();
    lockVault();
    showToast('Session timed out. Please unlock.', 'danger');
  }, SESSION_DURATION);
}

function lockVault() {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('addPasswordScreen').classList.add('hidden');
  showMasterPasswordModal(false);
}

function unlockVault() {
  document.getElementById('dashboard').classList.remove('hidden');
  hideMasterPasswordModal();
  setSession();
  renderVault();
  showScreen('dashboard');
  updateChangeMasterBtn();
}

// Master password modal logic
const masterForm = document.getElementById('masterPasswordForm');
if (masterForm) {
  masterForm.onsubmit = async function(e) {
    e.preventDefault();
    const input = document.getElementById('masterPasswordInput');
    const confirm = document.getElementById('masterPasswordConfirm');
    const error = document.getElementById('masterPasswordError');
    const setup = confirm.style.display !== 'none';
    const pwd = input.value;
    if (setup) {
      if (pwd.length < 6) {
        error.textContent = 'Password must be at least 6 characters.';
        return;
      }
      if (pwd !== confirm.value) {
        error.textContent = 'Passwords do not match.';
        return;
      }
      const hash = await sha256(pwd);
      localStorage.setItem(MASTER_KEY, hash);
      showToast('Master password set!', 'success');
      hideMasterPasswordModal();
      setSession();
      unlockVault();
    } else {
      const hash = await sha256(pwd);
      if (hash === localStorage.getItem(MASTER_KEY)) {
        hideMasterPasswordModal();
        setSession();
        unlockVault();
      } else {
        error.textContent = 'Incorrect master password.';
      }
    }
  };
}

// On load, require master password
window.onload = () => {
  if (!isMasterPasswordSet()) {
    showMasterPasswordModal(true);
    lockVault();
  } else if (!isSessionActive()) {
    lockVault();
  } else {
    unlockVault();
  }
};

// Reset session timer on user activity
['click', 'keydown', 'mousemove', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (isSessionActive()) resetSessionTimeout();
  });
});

// --- Secure reveal/edit ---
async function requireMasterPasswordForAction(action) {
  return new Promise((resolve) => {
    showMasterPasswordModal(false);
    const modal = document.getElementById('masterPasswordModal');
    const form = document.getElementById('masterPasswordForm');
    const input = document.getElementById('masterPasswordInput');
    const confirm = document.getElementById('masterPasswordConfirm');
    const error = document.getElementById('masterPasswordError');
    confirm.style.display = 'none';
    form.onsubmit = async function(e) {
      e.preventDefault();
      const pwd = input.value;
      const hash = await sha256(pwd);
      if (hash === localStorage.getItem(MASTER_KEY)) {
        hideMasterPasswordModal();
        setSession();
        error.textContent = '';
        resolve(true);
      } else {
        error.textContent = 'Incorrect master password.';
        resolve(false);
      }
    };
  });
}

// --- Override togglePwd and editEntry for security ---
function togglePwd(index, realPwd) {
  requireMasterPasswordForAction('reveal').then((ok) => {
    if (!ok) return;
    const el = document.getElementById(`pwd-${index}`);
    el.textContent = el.textContent === '••••••••' ? realPwd : '••••••••';
  });
}

function editEntry(index) {
  requireMasterPasswordForAction('edit').then((ok) => {
    if (!ok) return;
    editingIndex = index;
    const entry = vault[index];
    document.getElementById('appName').value = entry.site;
    document.getElementById('email').value = entry.username;
    document.getElementById('genPassword').value = entry.password;
    document.getElementById('notes').value = entry.notes || '';
    showScreen('addPasswordScreen');
  });
}

// Load existing vault on start
window.onload = () => {
  renderVault();
  showScreen('dashboard');
};

// When canceling, reset editingIndex
const cancelBtn = document.querySelector('#addPasswordForm button[type="button"][onclick*="showScreen"]');
if (cancelBtn) {
  cancelBtn.addEventListener('click', function() {
    editingIndex = null;
    document.getElementById('addPasswordForm').reset();
  });
}

// Show/hide Change Master Password button
function updateChangeMasterBtn() {
  const btn = document.getElementById('changeMasterBtn');
  if (!btn) return;
  if (isSessionActive()) {
    btn.style.display = '';
  } else {
    btn.style.display = 'none';
  }
}

// Show change master modal
const changeMasterBtn = document.getElementById('changeMasterBtn');
if (changeMasterBtn) {
  changeMasterBtn.onclick = () => {
    document.getElementById('changeMasterModal').classList.remove('hidden');
    document.getElementById('currentMasterInput').value = '';
    document.getElementById('newMasterInput').value = '';
    document.getElementById('newMasterConfirm').value = '';
    document.getElementById('changeMasterError').textContent = '';
    document.getElementById('currentMasterInput').focus();
  };
}

// Cancel change master
const cancelChangeMaster = document.getElementById('cancelChangeMaster');
if (cancelChangeMaster) {
  cancelChangeMaster.onclick = () => {
    document.getElementById('changeMasterModal').classList.add('hidden');
  };
}

// Change master password logic
const changeMasterForm = document.getElementById('changeMasterForm');
if (changeMasterForm) {
  changeMasterForm.onsubmit = async function(e) {
    e.preventDefault();
    const current = document.getElementById('currentMasterInput').value;
    const newPwd = document.getElementById('newMasterInput').value;
    const confirm = document.getElementById('newMasterConfirm').value;
    const error = document.getElementById('changeMasterError');
    if (newPwd.length < 6) {
      error.textContent = 'New password must be at least 6 characters.';
      return;
    }
    if (newPwd !== confirm) {
      error.textContent = 'New passwords do not match.';
      return;
    }
    const currentHash = await sha256(current);
    if (currentHash !== localStorage.getItem(MASTER_KEY)) {
      error.textContent = 'Current master password is incorrect.';
      return;
    }
    const newHash = await sha256(newPwd);
    localStorage.setItem(MASTER_KEY, newHash);
    document.getElementById('changeMasterModal').classList.add('hidden');
    showToast('Master password changed!', 'success');
    setSession();
    updateChangeMasterBtn();
  };
}

// Forgot master password (reset)
const forgotMasterLink = document.getElementById('forgotMasterLink');
if (forgotMasterLink) {
  forgotMasterLink.onclick = (e) => {
    e.preventDefault();
    if (!confirm('Resetting your master password will ERASE ALL saved passwords. Continue?')) return;
    localStorage.removeItem(MASTER_KEY);
    localStorage.removeItem('vaultData');
    clearSession();
    showToast('Vault reset. Please set a new master password.', 'danger');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };
}

// Update button visibility on unlock/lock
function unlockVault() {
  document.getElementById('dashboard').classList.remove('hidden');
  hideMasterPasswordModal();
  setSession();
  renderVault();
  showScreen('dashboard');
  updateChangeMasterBtn();
}
function lockVault() {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('addPasswordScreen').classList.add('hidden');
  showMasterPasswordModal(false);
  updateChangeMasterBtn();
}

// Dev: Force Reset button for testing first-time setup
const forceResetBtn = document.getElementById('forceResetBtn');
if (forceResetBtn) {
  forceResetBtn.onclick = () => {
    if (!confirm('This will erase ALL passwords and master password. Continue?')) return;
    localStorage.removeItem(MASTER_KEY);
    localStorage.removeItem('vaultData');
    clearSession();
    showToast('Vault reset. Reloading...', 'danger');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };
}

// Liquid glass SVG filter animation and interaction
const turb = document.getElementById('turb');
if (turb) {
  let frame = 0;
  function animateGlass() {
    frame += 0.01;
    turb.setAttribute('seed', 2 + 2 * Math.sin(frame));
    turb.setAttribute('baseFrequency', `${0.015 + 0.005 * Math.sin(frame)} 0.03`);
    requestAnimationFrame(animateGlass);
  }
  animateGlass();

  // Interactive distortion on hover/focus
  const glassEls = document.querySelectorAll('.container.glass, .modal-content, .vault-card, .top-bar');
  glassEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      const disp = turb.parentElement.querySelector('feDisplacementMap');
      if (disp) disp.setAttribute('scale', 32);
    });
    el.addEventListener('mouseleave', () => {
      const disp = turb.parentElement.querySelector('feDisplacementMap');
      if (disp) disp.setAttribute('scale', 18);
    });
    el.addEventListener('focusin', () => {
      const disp = turb.parentElement.querySelector('feDisplacementMap');
      if (disp) disp.setAttribute('scale', 32);
    });
    el.addEventListener('focusout', () => {
      const disp = turb.parentElement.querySelector('feDisplacementMap');
      if (disp) disp.setAttribute('scale', 18);
    });
  });
}
