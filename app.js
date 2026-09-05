// ============================================================
// PHONE ACCESSORIES INVENTORY SYSTEM - app.js
// ============================================================

'use strict';

// ── State ────────────────────────────────────────────────────
const STATE = {
  user: null,
  products: [],
  stockin: [],
  stockout: [],
  suppliers: [],
  inventory: [],
  users: [],
  sales: [],
  returns: [],
  posCart: [],
  posAllProducts: [],
};

// ── Utilities ────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const qs = (sel, ctx = document) => ctx.querySelector(sel);

function showToast(msg, type = 'success', duration = 3500) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function showLoading(msg = 'Loading...') {
  $('loadingText').textContent = msg;
  $('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  $('loadingOverlay').style.display = 'none';
}

function setButtonLoading(btn, loading, text = '') {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + (text || 'Saving...');
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}

function formatCurrency(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return '₱' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function showFieldError(fieldId, msg) {
  const el = $(fieldId);
  if (el) el.classList.add('error');
  return msg;
}

function clearFieldErrors(formId) {
  const form = $(formId);
  if (!form) return;
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
}

// ── API Call ─────────────────────────────────────────────────
// apiCall — all requests go as POST to avoid token in URL and GET length limits
async function apiCall(params, timeoutMs = 30000) {
  return apiPost(params, timeoutMs);
}

async function apiPost(params, timeoutMs = 30000) {
  const url = CONFIG.API_URL;
  if (!url || url === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
    throw new Error('API URL not configured. Please update config.js with your Google Apps Script Web App URL.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(params),
    });

    clearTimeout(timer);

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error('Invalid JSON response from server'); }
    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out.');
    throw err;
  }
}

function getAuthHeader() {
  const sess = getSession();
  return sess ? sess.token : '';
}

// ── Session ──────────────────────────────────────────────────
function saveSession(data) {
  sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
}

function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(CONFIG.SESSION_KEY));
  } catch { return null; }
}

function clearSession() {
  sessionStorage.removeItem(CONFIG.SESSION_KEY);
}

// ── Brute Force Protection ────────────────────────────────────
const BRUTE = {
  MAX_ATTEMPTS : 5,          // lock after this many failures
  LOCKOUT_MS   : 15 * 60 * 1000, // 15 minutes in ms
  KEY_ATTEMPTS : 'pais_login_attempts',
  KEY_LOCKOUT  : 'pais_login_lockout',
  _countdownTimer: null,
};

function bruteGetAttempts() {
  return parseInt(localStorage.getItem(BRUTE.KEY_ATTEMPTS) || '0', 10);
}

function bruteSetAttempts(n) {
  localStorage.setItem(BRUTE.KEY_ATTEMPTS, String(n));
}

function bruteGetLockoutUntil() {
  return parseInt(localStorage.getItem(BRUTE.KEY_LOCKOUT) || '0', 10);
}

function bruteSetLockout() {
  const until = Date.now() + BRUTE.LOCKOUT_MS;
  localStorage.setItem(BRUTE.KEY_LOCKOUT, String(until));
}

function bruteClear() {
  localStorage.removeItem(BRUTE.KEY_ATTEMPTS);
  localStorage.removeItem(BRUTE.KEY_LOCKOUT);
}

function bruteIsLocked() {
  const until = bruteGetLockoutUntil();
  if (!until) return false;
  if (Date.now() < until) return true;
  // Lockout expired — auto-clear
  bruteClear();
  return false;
}

/** Returns remaining lockout seconds (0 if not locked). */
function bruteSecondsLeft() {
  const until = bruteGetLockoutUntil();
  if (!until) return 0;
  const diff = Math.ceil((until - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

function bruteFormatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0
    ? `${m}m ${String(s).padStart(2, '0')}s`
    : `${s}s`;
}

/** Lock / unlock the login form inputs and button. */
function bruteSetFormLocked(locked, message = '') {
  const btn      = $('loginBtn');
  const usernameEl = $('loginUsername');
  const passwordEl = $('loginPassword');
  const errEl    = $('loginError');

  if (locked) {
    btn.disabled         = true;
    usernameEl.disabled  = true;
    passwordEl.disabled  = true;
    btn.innerHTML        = '<i class="fas fa-lock"></i> Account Locked';
    errEl.textContent    = message;
    errEl.style.display  = 'block';
    errEl.className      = 'alert alert-error alert-lockout';
  } else {
    btn.disabled         = false;
    usernameEl.disabled  = false;
    passwordEl.disabled  = false;
    btn.innerHTML        = '<i class="fas fa-sign-in-alt"></i> Login';
    errEl.style.display  = 'none';
    errEl.className      = 'alert alert-error';
  }
}

/** Start (or refresh) the countdown ticker shown in the error box. */
function bruteStartCountdown() {
  clearInterval(BRUTE._countdownTimer);

  const tick = () => {
    const secs = bruteSecondsLeft();
    if (secs <= 0) {
      clearInterval(BRUTE._countdownTimer);
      bruteClear();
      bruteSetFormLocked(false);
      showToast('Lockout expired. You may try again.', 'info');
      return;
    }
    const errEl = $('loginError');
    errEl.textContent =
      `Too many failed attempts. Account locked for ${bruteFormatTime(secs)}. Please wait.`;
  };

  tick(); // run immediately
  BRUTE._countdownTimer = setInterval(tick, 1000);
}

/** Call this on page load to restore any active lockout. */
function bruteCheckOnLoad() {
  if (bruteIsLocked()) {
    bruteSetFormLocked(true, '');
    bruteStartCountdown();
  }
}

/** Call on every failed login attempt. */
function bruteRecordFailure() {
  const attempts = bruteGetAttempts() + 1;
  bruteSetAttempts(attempts);

  const remaining = BRUTE.MAX_ATTEMPTS - attempts;

  if (attempts >= BRUTE.MAX_ATTEMPTS) {
    bruteSetLockout();
    bruteSetAttempts(0); // reset counter so it's clean after lockout expires
    bruteSetFormLocked(true, '');
    bruteStartCountdown();
    return { locked: true, message: null };
  }

  return {
    locked: false,
    message: remaining === 1
      ? `Warning: 1 attempt remaining before lockout.`
      : `Invalid credentials. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
  };
}

/** Call on successful login to reset counters. */
function bruteRecordSuccess() {
  clearInterval(BRUTE._countdownTimer);
  bruteClear();
}

// ── Auth ─────────────────────────────────────────────────────
function togglePassword() {
  const input = $('loginPassword');
  const icon = $('pwdEyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const username = $('loginUsername').value.trim();
  const password = $('loginPassword').value;
  const errEl    = $('loginError');
  const btn      = $('loginBtn');

  errEl.style.display = 'none';

  // ── Block immediately if already locked ──────────────────
  if (bruteIsLocked()) {
    bruteSetFormLocked(true, '');
    bruteStartCountdown();
    return;
  }

  if (!username || !password) {
    errEl.textContent = 'Please enter username and password.';
    errEl.style.display = 'block';
    return;
  }

  setButtonLoading(btn, true, 'Logging in...');

  try {
    const res = await apiPost({ action: 'login', username, password });

    if (res.success) {
      bruteRecordSuccess();
      saveSession(res.data);
      STATE.user = res.data;
      initApp();
    } else {
      // Record failure and show appropriate message
      const { locked, message } = bruteRecordFailure();
      if (!locked) {
        errEl.textContent   = message || res.message || 'Invalid username or password.';
        errEl.style.display = 'block';
      }
      // If locked, bruteRecordFailure already updated the UI
    }
  } catch (err) {
    errEl.textContent   = err.message || 'Login failed. Please try again.';
    errEl.style.display = 'block';
  } finally {
    // Only restore button if NOT locked
    if (!bruteIsLocked()) {
      setButtonLoading(btn, false);
    }
  }
}

function logout() {
  clearSession();
  STATE.user = null;
  $('mainApp').style.display = 'none';
  $('loginPage').style.display = 'flex';
  $('loginUsername').value = '';
  $('loginPassword').value = '';
  $('loginError').style.display = 'none';
  showToast('Logged out successfully.', 'info');
}

// ── App Init ─────────────────────────────────────────────────
function initApp() {
  const user = STATE.user;
  $('loginPage').style.display = 'none';
  $('mainApp').style.display = 'flex';

  $('headerUserName').textContent = user.fullName || user.username;
  $('headerUserRole').textContent = user.role;

  // Show/hide User Management
  if (user.role === 'Admin') {
    $('userMgmtNav').style.display = 'block';
  } else {
    $('userMgmtNav').style.display = 'none';
  }

  // Nav links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const mod = link.dataset.module;
      if (mod === 'users' && user.role !== 'Admin') {
        showToast('Access denied. Admin only.', 'error');
        return;
      }
      navigateTo(mod);
      closeSidebar();
    });
  });

  navigateTo('dashboard');
}

function navigateTo(module) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const page = $(`page-${module}`);
  if (page) page.classList.add('active');

  const navLink = document.querySelector(`.nav-link[data-module="${module}"]`);
  if (navLink) navLink.classList.add('active');

  const titles = {
    dashboard: 'Dashboard',
    products: 'Product Management',
    stockin: 'Stock In',
    stockout: 'Stock Out',
    suppliers: 'Supplier Management',
    inventory: 'Inventory Monitoring',
    users: 'User Management',
    pos: 'POS / Cashier',
    sales: 'Sales Reports',
    returns: 'Returns / Refunds',
  };
  $('headerTitle').textContent = titles[module] || module;

  switch (module) {
    case 'dashboard': loadDashboard(); break;
    case 'products': loadProducts(); break;
    case 'stockin': loadStockIn(); break;
    case 'stockout': loadStockOut(); break;
    case 'suppliers': loadSuppliers(); break;
    case 'inventory': loadInventory(); break;
    case 'users': loadUsers(); break;
    case 'pos': loadPOS(); break;
    case 'sales': loadSales(); break;
    case 'returns': loadReturns(); break;
  }
}

// ── Sidebar ───────────────────────────────────────────────────
function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarOverlay').classList.add('open');
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('open');
}

// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════
async function loadDashboard() {
  showLoading('Loading dashboard...');
  try {
    const sess = getSession();
    const [res, salesRes] = await Promise.all([
      apiCall({ action: 'getDashboard', token: sess.token }),
      apiCall({ action: 'getSales',     token: sess.token }),
    ]);
    if (res.success) {
      const d = res.data;
      $('statTotalProducts').textContent = d.totalProducts ?? '0';
      $('statTotalStock').textContent    = d.totalStock    ?? '0';
      $('statLowStock').textContent      = d.lowStock      ?? '0';
      $('statOutOfStock').textContent    = d.outOfStock    ?? '0';
      $('statTotalSuppliers').textContent = d.totalSuppliers    ?? '0';
      $('statRecentStockIn').textContent  = d.recentStockInCount  ?? '0';
      $('statRecentStockOut').textContent = d.recentStockOutCount ?? '0';

      renderDashStockIn(d.recentStockIn   || []);
      renderDashStockOut(d.recentStockOut || []);
      renderDashAlerts(d.alerts           || []);
    } else {
      showToast(res.message || 'Failed to load dashboard.', 'error');
    }
    if (salesRes.success) {
      $('statTodaySales').textContent = formatCurrency(salesRes.data.todayRevenue || 0);
    } else {
      $('statTodaySales').textContent = '₱0.00';
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function renderDashStockIn(rows) {
  const tbody = $('dashStockInBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No records</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.productName)}</td>
      <td><strong>${escapeHtml(String(r.quantity))}</strong></td>
      <td>${formatDate(r.date)}</td>
    </tr>`).join('');
}

function renderDashStockOut(rows) {
  const tbody = $('dashStockOutBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No records</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.productName)}</td>
      <td><strong>${escapeHtml(String(r.quantity))}</strong></td>
      <td>${formatDate(r.date)}</td>
    </tr>`).join('');
}

function renderDashAlerts(rows) {
  const tbody = $('dashAlertBody');
  if (!rows.length) { tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">All good!</td></tr>'; return; }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${escapeHtml(r.productName)}</td>
      <td><strong>${escapeHtml(String(r.currentStock))}</strong></td>
      <td>${stockStatusBadge(r.status)}</td>
    </tr>`).join('');
}

// ═══════════════════════════════════════════════════════════════
//  PRODUCTS
// ═══════════════════════════════════════════════════════════════
async function loadProducts() {
  showLoading('Loading products...');
  try {
    const sess = getSession();
    // Load suppliers in parallel for the product modal dropdown
    const [res, supRes] = await Promise.all([
      apiCall({ action: 'getProducts', token: sess.token }),
      STATE.suppliers.length
        ? Promise.resolve({ success: true, data: STATE.suppliers })
        : apiCall({ action: 'getSuppliers', token: sess.token })
    ]);
    if (supRes.success) STATE.suppliers = supRes.data || [];
    if (res.success) {
      STATE.products = res.data || [];
      renderProducts(STATE.products);
      populateProductDropdowns();
    } else { showToast(res.message || 'Failed to load products.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderProducts(list) {
  const tbody = $('productsBody');
  const empty = $('productsEmpty');
  if (!list.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const user = getSession();
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>${escapeHtml(p.productID)}</td>
      <td><strong>${escapeHtml(p.productName)}</strong></td>
      <td>${escapeHtml(p.category)}</td>
      <td>${escapeHtml(p.brand)}</td>
      <td>${escapeHtml(p.variant)}</td>
      <td>${escapeHtml(p.unit)}</td>
      <td>${formatCurrency(p.costPrice)}</td>
      <td>${formatCurrency(p.sellingPrice)}</td>
      <td><strong>${escapeHtml(String(p.quantity))}</strong></td>
      <td>${escapeHtml(String(p.reorderLevel))}</td>
      <td>${statusBadge(p.status)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="Edit" onclick="editProduct('${escapeHtml(p.productID)}')"><i class="fas fa-edit"></i></button>
        ${user && user.role === 'Admin' ? `<button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteProduct('${escapeHtml(p.productID)}')"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    </tr>`).join('');
}

function filterProducts() {
  const search = $('productSearch').value.toLowerCase();
  const cat = $('productCatFilter').value;
  const status = $('productStatusFilter').value;
  const filtered = STATE.products.filter(p => {
    const matchSearch = !search ||
      (p.productName || '').toLowerCase().includes(search) ||
      (p.brand || '').toLowerCase().includes(search) ||
      (p.productID || '').toLowerCase().includes(search);
    const matchCat = !cat || p.category === cat;
    const matchStatus = !status || p.status === status;
    return matchSearch && matchCat && matchStatus;
  });
  renderProducts(filtered);
}

function clearProductFilters() {
  $('productSearch').value = '';
  $('productCatFilter').value = '';
  $('productStatusFilter').value = '';
  renderProducts(STATE.products);
}

function openProductModal(data = null) {
  clearFieldErrors('productForm');
  $('productFormError').style.display = 'none';
  const form = $('productForm');
  form.reset();

  populateSupplierSelect('pSupplierID');

  if (data) {
    $('productModalTitle').textContent = 'Edit Product';
    $('pEditMode').value = 'edit';
    $('pOriginalID').value = data.productID;
    $('pProductID').value = data.productID;
    $('pProductID').readOnly = true;
    $('pProductName').value = data.productName || '';
    $('pCategory').value = data.category || '';
    $('pBrand').value = data.brand || '';
    $('pCompatiblePhone').value = data.compatiblePhone || '';
    $('pVariant').value = data.variant || '';
    $('pUnit').value = data.unit || '';
    $('pCostPrice').value = data.costPrice || 0;
    $('pSellingPrice').value = data.sellingPrice || 0;
    $('pQuantity').value = data.quantity || 0;
    $('pReorderLevel').value = data.reorderLevel || 0;
    $('pSupplierID').value = data.supplierID || '';
    $('pStatus').value = data.status || 'Active';
  } else {
    $('productModalTitle').textContent = 'Add Product';
    $('pEditMode').value = 'add';
    $('pOriginalID').value = '';
    $('pProductID').readOnly = false;
  }
  openModal('productModal');
}

function editProduct(id) {
  const p = STATE.products.find(x => x.productID === id);
  if (!p) { showToast('Product not found.', 'error'); return; }
  openProductModal(p);
}

function deleteProduct(id) {
  const p = STATE.products.find(x => x.productID === id);
  if (!p) return;
  $('confirmMessage').textContent = `Delete product "${p.productName}" (${p.productID})? This cannot be undone.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting product...');
    try {
      const sess = getSession();
      const res = await apiPost({ action: 'deleteProduct', productID: id, token: sess.token });
      if (res.success) {
        showToast('Product deleted.', 'success');
        loadProducts();
      } else { showToast(res.message || 'Delete failed.', 'error'); }
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}

async function handleProductSubmit(e) {
  e.preventDefault();
  clearFieldErrors('productForm');
  const errEl = $('productFormError');
  errEl.style.display = 'none';

  const mode = $('pEditMode').value;
  const data = {
    action: mode === 'edit' ? 'updateProduct' : 'addProduct',
    token: getSession().token,
    originalID: $('pOriginalID').value,
    productID: $('pProductID').value.trim(),
    productName: $('pProductName').value.trim(),
    category: $('pCategory').value,
    brand: $('pBrand').value.trim(),
    compatiblePhone: $('pCompatiblePhone').value.trim(),
    variant: $('pVariant').value.trim(),
    unit: $('pUnit').value.trim(),
    costPrice: parseFloat($('pCostPrice').value) || 0,
    sellingPrice: parseFloat($('pSellingPrice').value) || 0,
    quantity: parseInt($('pQuantity').value) || 0,
    reorderLevel: parseInt($('pReorderLevel').value) || 0,
    supplierID: $('pSupplierID').value,
    status: $('pStatus').value,
  };

  // Frontend validation
  const errors = [];
  if (!data.productID) errors.push(showFieldError('pProductID', 'Product ID is required.'));
  if (!data.productName) errors.push(showFieldError('pProductName', 'Product Name is required.'));
  if (!data.category) errors.push(showFieldError('pCategory', 'Category is required.'));
  if (!data.unit) errors.push(showFieldError('pUnit', 'Unit is required.'));
  if (data.costPrice < 0) errors.push(showFieldError('pCostPrice', 'Cost price cannot be negative.'));
  if (data.sellingPrice < 0) errors.push(showFieldError('pSellingPrice', 'Selling price cannot be negative.'));
  if (data.quantity < 0) errors.push('Quantity cannot be negative.');
  if (data.reorderLevel < 0) errors.push('Reorder level cannot be negative.');

  if (errors.length) {
    errEl.textContent = errors[0];
    errEl.style.display = 'block';
    return;
  }

  const btn = $('productSaveBtn');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'Product saved successfully.', 'success');
      closeModal('productModal');
      loadProducts();
    } else {
      errEl.textContent = res.message || 'Failed to save product.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  STOCK IN
// ═══════════════════════════════════════════════════════════════
async function loadStockIn() {
  showLoading('Loading stock-in records...');
  try {
    const sess = getSession();
    // Ensure products and suppliers are loaded for the modal dropdowns
    if (!STATE.products.length) {
      const pRes = await apiCall({ action: 'getProducts', token: sess.token });
      if (pRes.success) STATE.products = pRes.data || [];
    }
    if (!STATE.suppliers.length) {
      const sRes = await apiCall({ action: 'getSuppliers', token: sess.token });
      if (sRes.success) STATE.suppliers = sRes.data || [];
    }
    const res = await apiCall({ action: 'getStockIn', token: sess.token });
    if (res.success) {
      STATE.stockin = res.data || [];
      renderStockIn(STATE.stockin);
    } else { showToast(res.message || 'Failed to load stock-in.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderStockIn(list) {
  const tbody = $('stockinBody');
  const empty = $('stockinEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${escapeHtml(r.stockInID)}</td>
      <td>${escapeHtml(r.productName)}</td>
      <td><strong>${escapeHtml(String(r.quantity))}</strong></td>
      <td>${escapeHtml(r.supplierID || '—')}</td>
      <td>${escapeHtml(r.referenceNo || '—')}</td>
      <td>${formatDate(r.date)}</td>
      <td>${escapeHtml(r.remarks || '—')}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="Edit" onclick="editStockIn('${escapeHtml(r.stockInID)}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteStockIn('${escapeHtml(r.stockInID)}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function filterStockIn() {
  const search = $('stockinSearch').value.toLowerCase();
  const from = $('stockinDateFrom').value;
  const to = $('stockinDateTo').value;
  const filtered = STATE.stockin.filter(r => {
    const matchSearch = !search || (r.productName || '').toLowerCase().includes(search) || (r.stockInID || '').toLowerCase().includes(search);
    const d = r.date ? new Date(r.date) : null;
    const matchFrom = !from || (d && d >= new Date(from));
    const matchTo = !to || (d && d <= new Date(to + 'T23:59:59'));
    return matchSearch && matchFrom && matchTo;
  });
  renderStockIn(filtered);
}

function clearStockInFilters() {
  $('stockinSearch').value = '';
  $('stockinDateFrom').value = '';
  $('stockinDateTo').value = '';
  renderStockIn(STATE.stockin);
}

function openStockInModal(data = null) {
  clearFieldErrors('stockinForm');
  $('stockinFormError').style.display = 'none';
  $('stockinForm').reset();

  // Populate dropdowns
  populateProductSelect('siProductID');
  populateSupplierSelect('siSupplierID');
  $('siDate').value = todayISO();

  if (data) {
    $('stockinModalTitle').textContent = 'Edit Stock-In';
    $('siEditMode').value = 'edit';
    $('siOriginalID').value = data.stockInID;
    $('siStockInID').value = data.stockInID;
    $('siStockInID').readOnly = true;
    $('siProductID').value = data.productID || '';
    $('siQuantity').value = data.quantity || '';
    $('siSupplierID').value = data.supplierID || '';
    $('siReferenceNo').value = data.referenceNo || '';
    $('siDate').value = data.date || todayISO();
    $('siRemarks').value = data.remarks || '';
  } else {
    $('stockinModalTitle').textContent = 'Add Stock-In';
    $('siEditMode').value = 'add';
    $('siOriginalID').value = '';
    $('siStockInID').readOnly = false;
  }
  openModal('stockinModal');
}

function editStockIn(id) {
  const r = STATE.stockin.find(x => x.stockInID === id);
  if (!r) { showToast('Record not found.', 'error'); return; }
  openStockInModal(r);
}

function deleteStockIn(id) {
  const r = STATE.stockin.find(x => x.stockInID === id);
  if (!r) return;
  $('confirmMessage').textContent = `Delete stock-in record "${r.stockInID}" for "${r.productName}"? Inventory will be recalculated.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting...');
    try {
      const sess = getSession();
      const res = await apiPost({ action: 'deleteStockIn', stockInID: id, token: sess.token });
      if (res.success) { showToast('Stock-in deleted. Inventory updated.', 'success'); loadStockIn(); }
      else showToast(res.message || 'Delete failed.', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}

function onStockInProductChange() {}

async function handleStockInSubmit(e) {
  e.preventDefault();
  clearFieldErrors('stockinForm');
  const errEl = $('stockinFormError');
  errEl.style.display = 'none';

  const mode = $('siEditMode').value;
  const qty = parseInt($('siQuantity').value);

  const data = {
    action: mode === 'edit' ? 'updateStockIn' : 'addStockIn',
    token: getSession().token,
    originalID: $('siOriginalID').value,
    stockInID: $('siStockInID').value.trim(),
    productID: $('siProductID').value,
    quantity: qty,
    supplierID: $('siSupplierID').value,
    referenceNo: $('siReferenceNo').value.trim(),
    date: $('siDate').value,
    remarks: $('siRemarks').value.trim(),
  };

  // Frontend validation
  if (!data.stockInID) { errEl.textContent = 'Stock-In ID is required.'; errEl.style.display = 'block'; return; }
  if (!data.productID) { errEl.textContent = 'Product is required.'; errEl.style.display = 'block'; return; }
  if (!qty || qty < 1) { errEl.textContent = 'Quantity must be at least 1.'; errEl.style.display = 'block'; return; }
  if (!data.date) { errEl.textContent = 'Date is required.'; errEl.style.display = 'block'; return; }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'Stock-in saved. Inventory updated.', 'success');
      closeModal('stockinModal');
      loadStockIn();
    } else {
      errEl.textContent = res.message || 'Failed to save.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  STOCK OUT
// ═══════════════════════════════════════════════════════════════
async function loadStockOut() {
  showLoading('Loading stock-out records...');
  try {
    const sess = getSession();
    // Ensure products are loaded for the modal dropdown and stock check
    if (!STATE.products.length) {
      const pRes = await apiCall({ action: 'getProducts', token: sess.token });
      if (pRes.success) STATE.products = pRes.data || [];
    }
    const res = await apiCall({ action: 'getStockOut', token: sess.token });
    if (res.success) {
      STATE.stockout = res.data || [];
      renderStockOut(STATE.stockout);
    } else { showToast(res.message || 'Failed to load stock-out.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderStockOut(list) {
  const tbody = $('stockoutBody');
  const empty = $('stockoutEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${escapeHtml(r.stockOutID)}</td>
      <td>${escapeHtml(r.productName)}</td>
      <td><strong>${escapeHtml(String(r.quantity))}</strong></td>
      <td><span class="badge badge-warning">${escapeHtml(r.reason)}</span></td>
      <td>${formatDate(r.date)}</td>
      <td>${escapeHtml(r.remarks || '—')}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="Edit" onclick="editStockOut('${escapeHtml(r.stockOutID)}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteStockOut('${escapeHtml(r.stockOutID)}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function filterStockOut() {
  const search = $('stockoutSearch').value.toLowerCase();
  const reason = $('stockoutReasonFilter').value;
  const from = $('stockoutDateFrom').value;
  const to = $('stockoutDateTo').value;
  const filtered = STATE.stockout.filter(r => {
    const matchSearch = !search || (r.productName || '').toLowerCase().includes(search) || (r.stockOutID || '').toLowerCase().includes(search);
    const matchReason = !reason || r.reason === reason;
    const d = r.date ? new Date(r.date) : null;
    const matchFrom = !from || (d && d >= new Date(from));
    const matchTo = !to || (d && d <= new Date(to + 'T23:59:59'));
    return matchSearch && matchReason && matchFrom && matchTo;
  });
  renderStockOut(filtered);
}

function clearStockOutFilters() {
  $('stockoutSearch').value = '';
  $('stockoutReasonFilter').value = '';
  $('stockoutDateFrom').value = '';
  $('stockoutDateTo').value = '';
  renderStockOut(STATE.stockout);
}

function openStockOutModal(data = null) {
  clearFieldErrors('stockoutForm');
  $('stockoutFormError').style.display = 'none';
  $('stockoutForm').reset();

  populateProductSelect('soProductID');
  $('soDate').value = todayISO();
  $('soAvailableStock').value = '—';

  if (data) {
    $('stockoutModalTitle').textContent = 'Edit Stock-Out';
    $('soEditMode').value = 'edit';
    $('soOriginalID').value = data.stockOutID;
    $('soStockOutID').value = data.stockOutID;
    $('soStockOutID').readOnly = true;
    $('soProductID').value = data.productID || '';
    $('soQuantity').value = data.quantity || '';
    $('soReason').value = data.reason || '';
    $('soDate').value = data.date || todayISO();
    $('soRemarks').value = data.remarks || '';
    onStockOutProductChange();
  } else {
    $('stockoutModalTitle').textContent = 'Add Stock-Out';
    $('soEditMode').value = 'add';
    $('soOriginalID').value = '';
    $('soStockOutID').readOnly = false;
  }
  openModal('stockoutModal');
}

function onStockOutProductChange() {
  const pid = $('soProductID').value;
  if (!pid) { $('soAvailableStock').value = '—'; return; }
  const prod = STATE.products.find(p => p.productID === pid);
  $('soAvailableStock').value = prod ? prod.quantity : '—';
}

function editStockOut(id) {
  const r = STATE.stockout.find(x => x.stockOutID === id);
  if (!r) { showToast('Record not found.', 'error'); return; }
  openStockOutModal(r);
}

function deleteStockOut(id) {
  const r = STATE.stockout.find(x => x.stockOutID === id);
  if (!r) return;
  $('confirmMessage').textContent = `Delete stock-out record "${r.stockOutID}"? Inventory will be recalculated.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting...');
    try {
      const sess = getSession();
      const res = await apiPost({ action: 'deleteStockOut', stockOutID: id, token: sess.token });
      if (res.success) { showToast('Stock-out deleted. Inventory updated.', 'success'); loadStockOut(); }
      else showToast(res.message || 'Delete failed.', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}

async function handleStockOutSubmit(e) {
  e.preventDefault();
  clearFieldErrors('stockoutForm');
  const errEl = $('stockoutFormError');
  errEl.style.display = 'none';

  const mode = $('soEditMode').value;
  const qty = parseInt($('soQuantity').value);
  const productID = $('soProductID').value;

  const data = {
    action: mode === 'edit' ? 'updateStockOut' : 'addStockOut',
    token: getSession().token,
    originalID: $('soOriginalID').value,
    stockOutID: $('soStockOutID').value.trim(),
    productID,
    quantity: qty,
    reason: $('soReason').value,
    date: $('soDate').value,
    remarks: $('soRemarks').value.trim(),
  };

  // Frontend validation
  if (!data.stockOutID) { errEl.textContent = 'Stock-Out ID is required.'; errEl.style.display = 'block'; return; }
  if (!productID) { errEl.textContent = 'Product is required.'; errEl.style.display = 'block'; return; }
  if (!qty || qty < 1) { errEl.textContent = 'Quantity must be at least 1.'; errEl.style.display = 'block'; return; }
  if (!data.reason) { errEl.textContent = 'Reason is required.'; errEl.style.display = 'block'; return; }
  if (!data.date) { errEl.textContent = 'Date is required.'; errEl.style.display = 'block'; return; }

  // Client-side stock check for add mode
  if (mode === 'add') {
    const prod = STATE.products.find(p => p.productID === productID);
    if (prod && qty > parseInt(prod.quantity)) {
      errEl.textContent = `Insufficient stock. Available: ${prod.quantity}, Requested: ${qty}`;
      errEl.style.display = 'block';
      return;
    }
  }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'Stock-out saved. Inventory updated.', 'success');
      closeModal('stockoutModal');
      loadStockOut();
      // Refresh products cache for available stock display
      const prodRes = await apiCall({ action: 'getProducts', token: getSession().token });
      if (prodRes.success) STATE.products = prodRes.data || [];
    } else {
      errEl.textContent = res.message || 'Failed to save.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  SUPPLIERS
// ═══════════════════════════════════════════════════════════════
async function loadSuppliers() {
  showLoading('Loading suppliers...');
  try {
    const sess = getSession();
    const res = await apiCall({ action: 'getSuppliers', token: sess.token });
    if (res.success) {
      STATE.suppliers = res.data || [];
      renderSuppliers(STATE.suppliers);
      populateSupplierDropdowns();
    } else { showToast(res.message || 'Failed to load suppliers.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderSuppliers(list) {
  const tbody = $('suppliersBody');
  const empty = $('suppliersEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(s => `
    <tr>
      <td>${escapeHtml(s.supplierID)}</td>
      <td><strong>${escapeHtml(s.supplierName)}</strong></td>
      <td>${escapeHtml(s.contactPerson || '—')}</td>
      <td>${escapeHtml(s.phone || '—')}</td>
      <td>${escapeHtml(s.productCategory || '—')}</td>
      <td>${statusBadge(s.status)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="Edit" onclick="editSupplier('${escapeHtml(s.supplierID)}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm ${s.status === 'Active' ? 'btn-warning' : 'btn-success'} btn-icon" title="${s.status === 'Active' ? 'Deactivate' : 'Activate'}" onclick="toggleSupplierStatus('${escapeHtml(s.supplierID)}')">
          <i class="fas fa-${s.status === 'Active' ? 'ban' : 'check'}"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteSupplier('${escapeHtml(s.supplierID)}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`).join('');
}

function filterSuppliers() {
  const search = $('supplierSearch').value.toLowerCase();
  const status = $('supplierStatusFilter').value;
  const filtered = STATE.suppliers.filter(s => {
    const matchSearch = !search || (s.supplierName || '').toLowerCase().includes(search) || (s.supplierID || '').toLowerCase().includes(search);
    const matchStatus = !status || s.status === status;
    return matchSearch && matchStatus;
  });
  renderSuppliers(filtered);
}

function clearSupplierFilters() {
  $('supplierSearch').value = '';
  $('supplierStatusFilter').value = '';
  renderSuppliers(STATE.suppliers);
}

function openSupplierModal(data = null) {
  clearFieldErrors('supplierForm');
  $('supplierFormError').style.display = 'none';
  $('supplierForm').reset();

  if (data) {
    $('supplierModalTitle').textContent = 'Edit Supplier';
    $('supEditMode').value = 'edit';
    $('supOriginalID').value = data.supplierID;
    $('supSupplierID').value = data.supplierID;
    $('supSupplierID').readOnly = true;
    $('supSupplierName').value = data.supplierName || '';
    $('supContactPerson').value = data.contactPerson || '';
    $('supPhone').value = data.phone || '';
    $('supAddress').value = data.address || '';
    $('supProductCategory').value = data.productCategory || '';
    $('supStatus').value = data.status || 'Active';
  } else {
    $('supplierModalTitle').textContent = 'Add Supplier';
    $('supEditMode').value = 'add';
    $('supOriginalID').value = '';
    $('supSupplierID').readOnly = false;
  }
  openModal('supplierModal');
}

function editSupplier(id) {
  const s = STATE.suppliers.find(x => x.supplierID === id);
  if (!s) { showToast('Supplier not found.', 'error'); return; }
  openSupplierModal(s);
}

async function toggleSupplierStatus(id) {
  const s = STATE.suppliers.find(x => x.supplierID === id);
  if (!s) return;
  const newStatus = s.status === 'Active' ? 'Inactive' : 'Active';
  showLoading('Updating status...');
  try {
    const sess = getSession();
    const res = await apiPost({ action: 'updateSupplier', token: sess.token, originalID: id, ...s, status: newStatus });
    if (res.success) { showToast(`Supplier ${newStatus.toLowerCase()}.`, 'success'); loadSuppliers(); }
    else showToast(res.message || 'Update failed.', 'error');
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function deleteSupplier(id) {
  const s = STATE.suppliers.find(x => x.supplierID === id);
  if (!s) return;
  $('confirmMessage').textContent = `Delete supplier "${s.supplierName}"? This cannot be undone.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting...');
    try {
      const sess = getSession();
      const res = await apiPost({ action: 'deleteSupplier', supplierID: id, token: sess.token });
      if (res.success) { showToast('Supplier deleted.', 'success'); loadSuppliers(); }
      else showToast(res.message || 'Delete failed.', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}

async function handleSupplierSubmit(e) {
  e.preventDefault();
  clearFieldErrors('supplierForm');
  const errEl = $('supplierFormError');
  errEl.style.display = 'none';

  const mode = $('supEditMode').value;
  const data = {
    action: mode === 'edit' ? 'updateSupplier' : 'addSupplier',
    token: getSession().token,
    originalID: $('supOriginalID').value,
    supplierID: $('supSupplierID').value.trim(),
    supplierName: $('supSupplierName').value.trim(),
    contactPerson: $('supContactPerson').value.trim(),
    phone: $('supPhone').value.trim(),
    address: $('supAddress').value.trim(),
    productCategory: $('supProductCategory').value,
    status: $('supStatus').value,
  };

  if (!data.supplierID) { errEl.textContent = 'Supplier ID is required.'; errEl.style.display = 'block'; return; }
  if (!data.supplierName) { errEl.textContent = 'Supplier Name is required.'; errEl.style.display = 'block'; return; }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'Supplier saved.', 'success');
      closeModal('supplierModal');
      loadSuppliers();
    } else {
      errEl.textContent = res.message || 'Failed to save.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  INVENTORY MONITORING
// ═══════════════════════════════════════════════════════════════
async function loadInventory() {
  showLoading('Loading inventory...');
  try {
    const sess = getSession();
    const res = await apiCall({ action: 'getInventory', token: sess.token });
    if (res.success) {
      STATE.inventory = res.data || [];
      renderInventory(STATE.inventory);
    } else { showToast(res.message || 'Failed to load inventory.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderInventory(list) {
  const tbody = $('inventoryBody');
  const empty = $('inventoryEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${escapeHtml(r.productID)}</td>
      <td><strong>${escapeHtml(r.productName)}</strong></td>
      <td>${escapeHtml(r.category || '—')}</td>
      <td>${escapeHtml(String(r.stockIn || 0))}</td>
      <td>${escapeHtml(String(r.stockOut || 0))}</td>
      <td><strong style="font-size:1.05em;">${escapeHtml(String(r.currentStock || 0))}</strong></td>
      <td>${escapeHtml(String(r.reorderLevel || 0))}</td>
      <td>${stockStatusBadge(r.status)}</td>
    </tr>`).join('');
}

function filterInventory() {
  const search = $('inventorySearch').value.toLowerCase();
  const status = $('inventoryStatusFilter').value;
  const filtered = STATE.inventory.filter(r => {
    const matchSearch = !search || (r.productName || '').toLowerCase().includes(search) || (r.productID || '').toLowerCase().includes(search);
    const matchStatus = !status || r.status === status;
    return matchSearch && matchStatus;
  });
  renderInventory(filtered);
}

function clearInventoryFilters() {
  $('inventorySearch').value = '';
  $('inventoryStatusFilter').value = '';
  renderInventory(STATE.inventory);
}

// ═══════════════════════════════════════════════════════════════
//  USERS
// ═══════════════════════════════════════════════════════════════
async function loadUsers() {
  const sess = getSession();
  if (!sess || sess.role !== 'Admin') { showToast('Access denied.', 'error'); navigateTo('dashboard'); return; }
  showLoading('Loading users...');
  try {
    const res = await apiCall({ action: 'getUsers', token: sess.token });
    if (res.success) {
      STATE.users = res.data || [];
      renderUsers(STATE.users);
    } else { showToast(res.message || 'Failed to load users.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderUsers(list) {
  const tbody = $('usersBody');
  const empty = $('usersEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const me = getSession();
  tbody.innerHTML = list.map(u => `
    <tr>
      <td>${escapeHtml(u.userID)}</td>
      <td><strong>${escapeHtml(u.fullName)}</strong></td>
      <td>${escapeHtml(u.username)}</td>
      <td><span class="badge ${u.role === 'Admin' ? 'badge-purple' : 'badge-info'}">${escapeHtml(u.role)}</span></td>
      <td>${statusBadge(u.status)}</td>
      <td>${formatDate(u.dateCreated)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="Edit" onclick="editUser('${escapeHtml(u.userID)}')"><i class="fas fa-edit"></i></button>
        ${me && me.userID !== u.userID ? `<button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteUser('${escapeHtml(u.userID)}')"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    </tr>`).join('');
}

function filterUsers() {
  const search = $('userSearch').value.toLowerCase();
  const role = $('userRoleFilter').value;
  const status = $('userStatusFilter').value;
  const filtered = STATE.users.filter(u => {
    const matchSearch = !search || (u.fullName || '').toLowerCase().includes(search) || (u.username || '').toLowerCase().includes(search);
    const matchRole = !role || u.role === role;
    const matchStatus = !status || u.status === status;
    return matchSearch && matchRole && matchStatus;
  });
  renderUsers(filtered);
}

function clearUserFilters() {
  $('userSearch').value = '';
  $('userRoleFilter').value = '';
  $('userStatusFilter').value = '';
  renderUsers(STATE.users);
}

function openUserModal(data = null) {
  clearFieldErrors('userForm');
  $('userFormError').style.display = 'none';
  $('userForm').reset();

  if (data) {
    $('userModalTitle').textContent = 'Edit User';
    $('uEditMode').value = 'edit';
    $('uOriginalID').value = data.userID;
    $('uUserID').value = data.userID;
    $('uUserID').readOnly = true;
    $('uFullName').value = data.fullName || '';
    $('uUsername').value = data.username || '';
    $('uPassword').placeholder = 'Leave blank to keep current password';
    $('uPasswordHint').textContent = 'Leave blank to keep current password.';
    $('uRole').value = data.role || '';
    $('uStatus').value = data.status || 'Active';
  } else {
    $('userModalTitle').textContent = 'Add User';
    $('uEditMode').value = 'add';
    $('uOriginalID').value = '';
    $('uUserID').readOnly = false;
    $('uPassword').placeholder = 'Enter password';
    $('uPasswordHint').textContent = 'Required for new users.';
  }
  openModal('userModal');
}

function editUser(id) {
  const u = STATE.users.find(x => x.userID === id);
  if (!u) { showToast('User not found.', 'error'); return; }
  openUserModal(u);
}

function deleteUser(id) {
  const u = STATE.users.find(x => x.userID === id);
  if (!u) return;
  const me = getSession();
  if (me && me.userID === id) { showToast('You cannot delete your own account.', 'error'); return; }
  $('confirmMessage').textContent = `Delete user "${u.fullName} (${u.username})"? This cannot be undone.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting...');
    try {
      const sess = getSession();
      const res = await apiPost({ action: 'deleteUser', userID: id, token: sess.token });
      if (res.success) { showToast('User deleted.', 'success'); loadUsers(); }
      else showToast(res.message || 'Delete failed.', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}

async function handleUserSubmit(e) {
  e.preventDefault();
  clearFieldErrors('userForm');
  const errEl = $('userFormError');
  errEl.style.display = 'none';

  const mode = $('uEditMode').value;
  const password = $('uPassword').value;

  if (mode === 'add' && !password) {
    errEl.textContent = 'Password is required for new users.';
    errEl.style.display = 'block';
    return;
  }

  const data = {
    action: mode === 'edit' ? 'updateUser' : 'addUser',
    token: getSession().token,
    originalID: $('uOriginalID').value,
    userID: $('uUserID').value.trim(),
    fullName: $('uFullName').value.trim(),
    username: $('uUsername').value.trim(),
    password,
    role: $('uRole').value,
    status: $('uStatus').value,
  };

  if (!data.userID) { errEl.textContent = 'User ID is required.'; errEl.style.display = 'block'; return; }
  if (!data.fullName) { errEl.textContent = 'Full Name is required.'; errEl.style.display = 'block'; return; }
  if (!data.username) { errEl.textContent = 'Username is required.'; errEl.style.display = 'block'; return; }
  if (!data.role) { errEl.textContent = 'Role is required.'; errEl.style.display = 'block'; return; }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'User saved.', 'success');
      closeModal('userModal');
      loadUsers();
    } else {
      errEl.textContent = res.message || 'Failed to save.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS - Dropdowns & Badges
// ═══════════════════════════════════════════════════════════════
function populateProductSelect(selectId) {
  const sel = $(selectId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Select Product</option>';
  STATE.products.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.productID;
    opt.textContent = `${p.productID} - ${p.productName}`;
    sel.appendChild(opt);
  });
  sel.value = current;
}

function populateSupplierSelect(selectId) {
  const sel = $(selectId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">Select Supplier</option>';
  STATE.suppliers.forEach(s => {
    if (s.status === 'Active') {
      const opt = document.createElement('option');
      opt.value = s.supplierID;
      opt.textContent = `${s.supplierID} - ${s.supplierName}`;
      sel.appendChild(opt);
    }
  });
  sel.value = current;
}

function populateProductDropdowns() {
  populateProductSelect('siProductID');
  populateProductSelect('soProductID');
  populateSupplierSelect('pSupplierID');
}

function populateSupplierDropdowns() {
  populateSupplierSelect('pSupplierID');
  populateSupplierSelect('siSupplierID');
}

function statusBadge(status) {
  if (status === 'Active') return '<span class="badge badge-success">Active</span>';
  return '<span class="badge badge-secondary">Inactive</span>';
}

function stockStatusBadge(status) {
  if (!status) return '<span class="badge badge-secondary">—</span>';
  const s = status.toLowerCase();
  if (s === 'out of stock') return '<span class="badge badge-danger">Out of Stock</span>';
  if (s === 'low stock') return '<span class="badge badge-warning">Low Stock</span>';
  if (s === 'in stock') return '<span class="badge badge-success">In Stock</span>';
  return `<span class="badge badge-secondary">${escapeHtml(status)}</span>`;
}

// ═══════════════════════════════════════════════════════════════
//  FORM EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Check existing session
  const sess = getSession();
  if (sess && sess.token) {
    STATE.user = sess;
    initApp();
  } else {
    // Show login page
    $('loginPage').style.display = 'flex';
    $('mainApp').style.display = 'none';
    // Restore any active brute-force lockout
    bruteCheckOnLoad();
  }

  // Login form
  $('loginForm').addEventListener('submit', handleLogin);

  // Product form
  $('productForm').addEventListener('submit', handleProductSubmit);

  // Stock-in form
  $('stockinForm').addEventListener('submit', handleStockInSubmit);

  // Stock-out form
  $('stockoutForm').addEventListener('submit', handleStockOutSubmit);

  // Supplier form
  $('supplierForm').addEventListener('submit', handleSupplierSubmit);

  // User form
  $('userForm').addEventListener('submit', handleUserSubmit);

  // Return form
  $('returnForm').addEventListener('submit', handleReturnSubmit);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  POS / CASHIER
// ═══════════════════════════════════════════════════════════════
async function loadPOS() {
  showLoading('Loading POS...');
  try {
    const sess = getSession();
    if (!STATE.products.length || !STATE.posAllProducts.length) {
      const res = await apiCall({ action: 'getProducts', token: sess.token });
      if (res.success) {
        STATE.products = res.data || [];
        STATE.posAllProducts = STATE.products.filter(p => p.status === 'Active');
      }
    } else {
      STATE.posAllProducts = STATE.products.filter(p => p.status === 'Active');
    }
    renderPosProducts(STATE.posAllProducts);
    renderCart();
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderPosProducts(list) {
  const grid = $('posProductsGrid');
  if (!list.length) {
    grid.innerHTML = '<div class="pos-empty"><i class="fas fa-box-open"></i><p>No products found.</p></div>';
    return;
  }
  grid.innerHTML = list.map(p => {
    const outOfStock = parseInt(p.quantity) <= 0;
    return `
    <div class="pos-product-card ${outOfStock ? 'pos-out-of-stock' : ''}" onclick="${outOfStock ? '' : `addToCart('${escapeHtml(p.productID)}')`}">
      <div class="pos-product-icon"><i class="fas fa-mobile-alt"></i></div>
      <div class="pos-product-name">${escapeHtml(p.productName)}</div>
      <div class="pos-product-price">${formatCurrency(p.sellingPrice)}</div>
      <div class="pos-product-stock ${outOfStock ? 'out' : parseInt(p.quantity) <= (p.reorderLevel || 5) ? 'low' : ''}">
        Stock: ${escapeHtml(String(p.quantity))}
      </div>
      ${outOfStock ? '<div class="pos-oos-label">OUT OF STOCK</div>' : ''}
    </div>`;
  }).join('');
}

function filterPosProducts() {
  const q = $('posSearch').value.toLowerCase().trim();
  if (!q) { renderPosProducts(STATE.posAllProducts); return; }
  const filtered = STATE.posAllProducts.filter(p =>
    (p.productName || '').toLowerCase().includes(q) ||
    (p.productID || '').toLowerCase().includes(q) ||
    (p.brand || '').toLowerCase().includes(q)
  );
  renderPosProducts(filtered);
}

function addToCart(productID) {
  const prod = STATE.posAllProducts.find(p => p.productID === productID);
  if (!prod) return;
  const existing = STATE.posCart.find(c => c.productID === productID);
  if (existing) {
    if (existing.qty >= parseInt(prod.quantity)) {
      showToast('Cannot exceed available stock.', 'warning');
      return;
    }
    existing.qty++;
  } else {
    STATE.posCart.push({
      productID: prod.productID,
      productName: prod.productName,
      price: parseFloat(prod.sellingPrice) || 0,
      qty: 1,
      maxQty: parseInt(prod.quantity),
    });
  }
  renderCart();
  updateCartTotals();
  showToast(`${prod.productName} added to cart.`, 'success', 1200);
}

function removeFromCart(productID) {
  STATE.posCart = STATE.posCart.filter(c => c.productID !== productID);
  renderCart();
  updateCartTotals();
}

function changeCartQty(productID, delta) {
  const item = STATE.posCart.find(c => c.productID === productID);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { removeFromCart(productID); return; }
  if (item.qty > item.maxQty) {
    item.qty = item.maxQty;
    showToast('Cannot exceed available stock.', 'warning');
  }
  renderCart();
  updateCartTotals();
}

function clearCart() {
  STATE.posCart = [];
  $('posDiscount').value = 0;
  $('posCash').value = 0;
  $('posCustomerName').value = '';
  $('posReferenceNo').value = '';
  renderCart();
  updateCartTotals();
}

function renderCart() {
  const container = $('posCartItems');
  if (!STATE.posCart.length) {
    container.innerHTML = '<div class="pos-cart-empty"><i class="fas fa-shopping-cart"></i><p>Cart is empty</p></div>';
    return;
  }
  container.innerHTML = STATE.posCart.map(item => `
    <div class="pos-cart-item">
      <div class="pos-cart-item-info">
        <span class="pos-cart-item-name">${escapeHtml(item.productName)}</span>
        <span class="pos-cart-item-price">${formatCurrency(item.price)} each</span>
      </div>
      <div class="pos-cart-item-controls">
        <button class="pos-qty-btn" onclick="changeCartQty('${escapeHtml(item.productID)}', -1)"><i class="fas fa-minus"></i></button>
        <span class="pos-cart-qty">${item.qty}</span>
        <button class="pos-qty-btn" onclick="changeCartQty('${escapeHtml(item.productID)}', 1)"><i class="fas fa-plus"></i></button>
        <span class="pos-cart-line-total">${formatCurrency(item.price * item.qty)}</span>
        <button class="pos-remove-btn" onclick="removeFromCart('${escapeHtml(item.productID)}')"><i class="fas fa-times"></i></button>
      </div>
    </div>
  `).join('');
}

function updateCartTotals() {
  const subtotal = STATE.posCart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountPct = Math.min(Math.max(parseFloat($('posDiscount').value) || 0, 0), 100);
  const discountAmt = subtotal * (discountPct / 100);
  const total = subtotal - discountAmt;

  $('posSubtotal').textContent = formatCurrency(subtotal);
  $('posTotal').textContent = formatCurrency(total);
  computeChange();
}

function computeChange() {
  const total = parseFloat($('posTotal').textContent.replace('₱', '').replace(/,/g, '')) || 0;
  const cash = parseFloat($('posCash').value) || 0;
  const change = cash - total;
  const el = $('posChange');
  el.textContent = formatCurrency(Math.max(change, 0));
  el.style.color = change < 0 ? '#e74c3c' : '#16a34a';
}

async function processCheckout() {
  if (!STATE.posCart.length) {
    showToast('Cart is empty.', 'warning');
    return;
  }

  const subtotal = STATE.posCart.reduce((s, c) => s + c.price * c.qty, 0);
  const discountPct = Math.min(Math.max(parseFloat($('posDiscount').value) || 0, 0), 100);
  const discountAmt = subtotal * (discountPct / 100);
  const total = subtotal - discountAmt;
  const cash = parseFloat($('posCash').value) || 0;

  if (cash < total) {
    showToast('Cash tendered is less than the total amount.', 'error');
    return;
  }

  const btn = $('checkoutBtn');
  btn.disabled = true;
  showLoading('Processing sale...');

  try {
    const sess = getSession();
    const payload = {
      action: 'processSale',
      token: sess.token,
      items: STATE.posCart.map(c => ({
        productID: c.productID,
        productName: c.productName,
        qty: c.qty,
        unitPrice: c.price,
        lineTotal: c.price * c.qty,
      })),
      subtotal,
      discountPct,
      discountAmt,
      total,
      cash,
      change: cash - total,
      customerName: $('posCustomerName').value.trim(),
      referenceNo: $('posReferenceNo').value.trim(),
    };

    const res = await apiPost(payload);
    if (res.success) {
      const saleData = res.data;
      // Reload products to reflect updated stock
      const pRes = await apiCall({ action: 'getProducts', token: sess.token });
      if (pRes.success) {
        STATE.products = pRes.data || [];
        STATE.posAllProducts = STATE.products.filter(p => p.status === 'Active');
      }
      filterPosProducts();
      showReceiptModal(saleData);
      clearCart();
      showToast('Sale processed successfully!', 'success');
    } else {
      showToast(res.message || 'Failed to process sale.', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
    btn.disabled = false;
  }
}

function showReceiptModal(sale) {
  const itemRows = (sale.items || []).map(it => `
    <tr>
      <td>${escapeHtml(it.productName)}</td>
      <td style="text-align:center;">${it.qty}</td>
      <td style="text-align:right;">${formatCurrency(it.unitPrice)}</td>
      <td style="text-align:right;"><strong>${formatCurrency(it.lineTotal)}</strong></td>
    </tr>
  `).join('');

  $('receiptContent').innerHTML = `
    <div class="receipt-wrap">
      <div class="receipt-header">
        <div class="receipt-logo"><i class="fas fa-mobile-alt"></i></div>
        <h2>Phone Accessories</h2>
        <p>Official Receipt</p>
        <p class="receipt-no"><strong>Receipt #: ${escapeHtml(sale.receiptNo)}</strong></p>
        <p>${escapeHtml(sale.date || '')}</p>
        ${sale.customerName ? `<p>Customer: ${escapeHtml(sale.customerName)}</p>` : ''}
      </div>
      <table class="receipt-items">
        <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="receipt-totals">
        <div class="receipt-row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
        ${sale.discountPct > 0 ? `<div class="receipt-row"><span>Discount (${sale.discountPct}%)</span><span>-${formatCurrency(sale.discountAmt)}</span></div>` : ''}
        <div class="receipt-row receipt-row-total"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
        <div class="receipt-row"><span>Cash</span><span>${formatCurrency(sale.cash)}</span></div>
        <div class="receipt-row"><span>Change</span><span>${formatCurrency(sale.change)}</span></div>
      </div>
      <div class="receipt-footer">
        <p>Cashier: ${escapeHtml(sale.cashierName || sale.cashier || '—')}</p>
        <p>Thank you for your purchase!</p>
      </div>
    </div>
  `;
  openModal('receiptModal');
}

function printReceipt() {
  const content = $('receiptContent').innerHTML;
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`
    <html><head><title>Receipt</title>
    <style>
      body { font-family: monospace; font-size: 13px; margin: 0; padding: 16px; }
      .receipt-wrap { max-width: 320px; margin: 0 auto; }
      .receipt-header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px; }
      .receipt-header h2 { margin: 0; font-size: 18px; }
      .receipt-header p { margin: 2px 0; }
      .receipt-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .receipt-items th, .receipt-items td { padding: 3px 4px; font-size: 12px; }
      .receipt-items thead { border-bottom: 1px solid #333; }
      .receipt-totals { border-top: 1px dashed #333; padding-top: 8px; }
      .receipt-row { display: flex; justify-content: space-between; margin: 2px 0; }
      .receipt-row-total { font-weight: bold; font-size: 15px; border-top: 1px solid #333; padding-top: 4px; margin-top: 4px; }
      .receipt-footer { text-align: center; border-top: 1px dashed #333; margin-top: 8px; padding-top: 8px; font-size: 11px; }
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  SALES REPORTS
// ═══════════════════════════════════════════════════════════════
async function loadSales() {
  showLoading('Loading sales...');
  try {
    const sess = getSession();
    const res = await apiCall({ action: 'getSales', token: sess.token });
    if (res.success) {
      STATE.sales = res.data.sales || [];
      renderSalesSummary(res.data);
      renderSales(STATE.sales);
      renderBestSellers(res.data.bestSellers || []);
    } else { showToast(res.message || 'Failed to load sales.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderSalesSummary(data) {
  $('salesTodayRevenue').textContent  = formatCurrency(data.todayRevenue   || 0);
  $('salesTodayCount').textContent    = data.todayCount    ?? '0';
  $('salesMonthRevenue').textContent  = formatCurrency(data.monthRevenue   || 0);
  $('salesTotalRevenue').textContent  = formatCurrency(data.totalRevenue   || 0);
}

function renderSales(list) {
  const tbody = $('salesBody');
  const empty = $('salesEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.receiptNo)}</strong></td>
      <td>${formatDate(s.date)}</td>
      <td>${escapeHtml(s.customerName || '—')}</td>
      <td style="text-align:center;">${escapeHtml(String(s.itemCount || 0))}</td>
      <td>${formatCurrency(s.subtotal)}</td>
      <td>${s.discountPct > 0 ? escapeHtml(String(s.discountPct)) + '%' : '—'}</td>
      <td><strong>${formatCurrency(s.total)}</strong></td>
      <td>${formatCurrency(s.cash)}</td>
      <td>${formatCurrency(s.change)}</td>
      <td>${escapeHtml(s.cashierName || s.cashier || '—')}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-primary btn-icon" title="View" onclick="viewSaleDetail('${escapeHtml(s.receiptNo)}')">
          <i class="fas fa-eye"></i>
        </button>
      </td>
    </tr>`).join('');
}

function filterSales() {
  const from   = $('salesDateFrom').value;
  const to     = $('salesDateTo').value;
  const search = $('salesSearch').value.toLowerCase();
  const filtered = STATE.sales.filter(s => {
    const d = s.date ? new Date(s.date) : null;
    const matchFrom   = !from || (d && d >= new Date(from));
    const matchTo     = !to   || (d && d <= new Date(to + 'T23:59:59'));
    const matchSearch = !search ||
      (s.receiptNo    || '').toLowerCase().includes(search) ||
      (s.customerName || '').toLowerCase().includes(search);
    return matchFrom && matchTo && matchSearch;
  });
  renderSales(filtered);
}

function clearSalesFilters() {
  $('salesDateFrom').value = '';
  $('salesDateTo').value   = '';
  $('salesSearch').value   = '';
  renderSales(STATE.sales);
}

function renderBestSellers(list) {
  const tbody = $('bestSellersBody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No data yet.</td></tr>'; return; }
  tbody.innerHTML = list.map((item, i) => `
    <tr>
      <td><strong>#${i + 1}</strong></td>
      <td>${escapeHtml(item.productName)}</td>
      <td>${escapeHtml(item.category || '—')}</td>
      <td><strong>${escapeHtml(String(item.qtySold))}</strong></td>
      <td>${formatCurrency(item.revenue)}</td>
    </tr>`).join('');
}

async function viewSaleDetail(receiptNo) {
  showLoading('Loading sale details...');
  try {
    const sess = getSession();
    const res = await apiCall({ action: 'getSaleDetail', token: sess.token, receiptNo });
    if (res.success) {
      const sale = res.data;
      const itemRows = (sale.items || []).map(it => `
        <tr>
          <td>${escapeHtml(it.productName)}</td>
          <td style="text-align:center;">${it.qty}</td>
          <td style="text-align:right;">${formatCurrency(it.unitPrice)}</td>
          <td style="text-align:right;"><strong>${formatCurrency(it.lineTotal)}</strong></td>
        </tr>`).join('');

      $('saleDetailContent').innerHTML = `
        <div class="receipt-wrap">
          <div class="receipt-header">
            <div class="receipt-logo"><i class="fas fa-mobile-alt"></i></div>
            <h2>Phone Accessories</h2>
            <p>Official Receipt</p>
            <p class="receipt-no"><strong>Receipt #: ${escapeHtml(sale.receiptNo)}</strong></p>
            <p>${escapeHtml(sale.date || '')}</p>
            ${sale.customerName ? `<p>Customer: ${escapeHtml(sale.customerName)}</p>` : ''}
          </div>
          <table class="receipt-items">
            <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div class="receipt-totals">
            <div class="receipt-row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
            ${sale.discountPct > 0 ? `<div class="receipt-row"><span>Discount (${sale.discountPct}%)</span><span>-${formatCurrency(sale.discountAmt)}</span></div>` : ''}
            <div class="receipt-row receipt-row-total"><span>TOTAL</span><span>${formatCurrency(sale.total)}</span></div>
            <div class="receipt-row"><span>Cash</span><span>${formatCurrency(sale.cash)}</span></div>
            <div class="receipt-row"><span>Change</span><span>${formatCurrency(sale.change)}</span></div>
          </div>
          <div class="receipt-footer">
            <p>Cashier: ${escapeHtml(sale.cashierName || sale.cashier || '—')}</p>
            <p>Thank you for your purchase!</p>
          </div>
        </div>`;
      openModal('saleDetailModal');
    } else { showToast(res.message || 'Failed to load sale details.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function printSaleDetail() {
  const content = $('saleDetailContent').innerHTML;
  const win = window.open('', '_blank', 'width=400,height=600');
  win.document.write(`
    <html><head><title>Receipt</title>
    <style>
      body { font-family: monospace; font-size: 13px; margin: 0; padding: 16px; }
      .receipt-wrap { max-width: 320px; margin: 0 auto; }
      .receipt-header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px; }
      .receipt-header h2 { margin: 0; font-size: 18px; }
      .receipt-header p { margin: 2px 0; }
      .receipt-items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .receipt-items th, .receipt-items td { padding: 3px 4px; font-size: 12px; }
      .receipt-items thead { border-bottom: 1px solid #333; }
      .receipt-totals { border-top: 1px dashed #333; padding-top: 8px; }
      .receipt-row { display: flex; justify-content: space-between; margin: 2px 0; }
      .receipt-row-total { font-weight: bold; font-size: 15px; border-top: 1px solid #333; padding-top: 4px; margin-top: 4px; }
      .receipt-footer { text-align: center; border-top: 1px dashed #333; margin-top: 8px; padding-top: 8px; font-size: 11px; }
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

// ═══════════════════════════════════════════════════════════════
//  RETURNS / REFUNDS
// ═══════════════════════════════════════════════════════════════
async function loadReturns() {
  showLoading('Loading returns...');
  try {
    const sess = getSession();
    if (!STATE.products.length) {
      const pRes = await apiCall({ action: 'getProducts', token: sess.token });
      if (pRes.success) STATE.products = pRes.data || [];
    }
    const res = await apiCall({ action: 'getReturns', token: sess.token });
    if (res.success) {
      STATE.returns = res.data || [];
      renderReturns(STATE.returns);
    } else { showToast(res.message || 'Failed to load returns.', 'error'); }
  } catch (err) { showToast(err.message, 'error'); }
  finally { hideLoading(); }
}

function renderReturns(list) {
  const tbody = $('returnsBody');
  const empty = $('returnsEmpty');
  if (!list.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${escapeHtml(r.returnID)}</td>
      <td>${escapeHtml(r.receiptNo || '—')}</td>
      <td>${escapeHtml(r.productName)}</td>
      <td style="text-align:center;"><strong>${escapeHtml(String(r.quantity))}</strong></td>
      <td>${formatCurrency(r.refundAmount)}</td>
      <td>${returnTypeBadge(r.returnType)}</td>
      <td>${escapeHtml(r.reason)}</td>
      <td>${formatDate(r.date)}</td>
      <td>${escapeHtml(r.processedBy || '—')}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-danger btn-icon" title="Delete" onclick="deleteReturn('${escapeHtml(r.returnID)}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

function returnTypeBadge(type) {
  if (type === 'Restock') return '<span class="badge badge-success">Restock</span>';
  if (type === 'Damaged') return '<span class="badge badge-danger">Damaged</span>';
  return `<span class="badge badge-secondary">${escapeHtml(type || '—')}</span>`;
}

function filterReturns() {
  const search = $('returnSearch').value.toLowerCase();
  const type   = $('returnTypeFilter').value;
  const from   = $('returnDateFrom').value;
  const to     = $('returnDateTo').value;
  const filtered = STATE.returns.filter(r => {
    const matchSearch = !search ||
      (r.returnID     || '').toLowerCase().includes(search) ||
      (r.productName  || '').toLowerCase().includes(search) ||
      (r.receiptNo    || '').toLowerCase().includes(search);
    const matchType = !type || r.returnType === type;
    const d = r.date ? new Date(r.date) : null;
    const matchFrom = !from || (d && d >= new Date(from));
    const matchTo   = !to   || (d && d <= new Date(to + 'T23:59:59'));
    return matchSearch && matchType && matchFrom && matchTo;
  });
  renderReturns(filtered);
}

function clearReturnFilters() {
  $('returnSearch').value      = '';
  $('returnTypeFilter').value  = '';
  $('returnDateFrom').value    = '';
  $('returnDateTo').value      = '';
  renderReturns(STATE.returns);
}

function openReturnModal(data = null) {
  $('returnFormError').style.display = 'none';
  $('returnForm').reset();
  populateProductSelect('retProductID');
  $('retDate').value = todayISO();

  if (data) {
    $('returnModalTitle').innerHTML = '<i class="fas fa-undo-alt"></i> Edit Return';
    $('retEditMode').value     = 'edit';
    $('retOriginalID').value   = data.returnID;
    $('retReturnID').value     = data.returnID;
    $('retReturnID').readOnly  = true;
    $('retReceiptNo').value    = data.receiptNo || '';
    $('retProductID').value    = data.productID || '';
    $('retQuantity').value     = data.quantity  || '';
    $('retRefundAmount').value = data.refundAmount || '';
    $('retType').value         = data.returnType   || '';
    $('retReason').value       = data.reason       || '';
    $('retDate').value         = data.date         || todayISO();
    $('retRemarks').value      = data.remarks      || '';
  } else {
    $('returnModalTitle').innerHTML = '<i class="fas fa-undo-alt"></i> New Return / Refund';
    $('retEditMode').value    = 'add';
    $('retOriginalID').value  = '';
    $('retReturnID').readOnly = false;
  }
  openModal('returnModal');
}

function onReturnProductChange() {
  const pid  = $('retProductID').value;
  const prod = STATE.products.find(p => p.productID === pid);
  if (prod) $('retRefundAmount').value = parseFloat(prod.sellingPrice).toFixed(2);
}

async function handleReturnSubmit(e) {
  e.preventDefault();
  const errEl = $('returnFormError');
  errEl.style.display = 'none';

  const mode = $('retEditMode').value;
  const qty  = parseInt($('retQuantity').value);
  const data = {
    action: mode === 'edit' ? 'updateReturn' : 'addReturn',
    token: getSession().token,
    originalID:    $('retOriginalID').value,
    returnID:      $('retReturnID').value.trim(),
    receiptNo:     $('retReceiptNo').value.trim(),
    productID:     $('retProductID').value,
    quantity:      qty,
    refundAmount:  parseFloat($('retRefundAmount').value) || 0,
    returnType:    $('retType').value,
    reason:        $('retReason').value,
    date:          $('retDate').value,
    remarks:       $('retRemarks').value.trim(),
  };

  if (!data.returnID)    { errEl.textContent = 'Return ID is required.';     errEl.style.display = 'block'; return; }
  if (!data.productID)   { errEl.textContent = 'Product is required.';       errEl.style.display = 'block'; return; }
  if (!qty || qty < 1)   { errEl.textContent = 'Quantity must be at least 1.'; errEl.style.display = 'block'; return; }
  if (!data.returnType)  { errEl.textContent = 'Return type is required.';   errEl.style.display = 'block'; return; }
  if (!data.reason)      { errEl.textContent = 'Reason is required.';        errEl.style.display = 'block'; return; }
  if (!data.date)        { errEl.textContent = 'Date is required.';          errEl.style.display = 'block'; return; }

  const btn = e.target.querySelector('[type="submit"]');
  setButtonLoading(btn, true);
  try {
    const res = await apiPost(data);
    if (res.success) {
      showToast(res.message || 'Return saved.', 'success');
      closeModal('returnModal');
      loadReturns();
      // Refresh products if restocked
      if (data.returnType === 'Restock') {
        const sess = getSession();
        const pRes = await apiCall({ action: 'getProducts', token: sess.token });
        if (pRes.success) {
          STATE.products     = pRes.data || [];
          STATE.posAllProducts = STATE.products.filter(p => p.status === 'Active');
        }
      }
    } else {
      errEl.textContent = res.message || 'Failed to save return.';
      errEl.style.display = 'block';
    }
  } catch (err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  } finally {
    setButtonLoading(btn, false);
  }
}

function deleteReturn(id) {
  const r = STATE.returns.find(x => x.returnID === id);
  if (!r) return;
  $('confirmMessage').textContent = `Delete return record "${r.returnID}"? This cannot be undone.`;
  openModal('confirmModal');
  $('confirmDeleteBtn').onclick = async () => {
    closeModal('confirmModal');
    showLoading('Deleting...');
    try {
      const sess = getSession();
      const res  = await apiPost({ action: 'deleteReturn', returnID: id, token: sess.token });
      if (res.success) { showToast('Return deleted.', 'success'); loadReturns(); }
      else showToast(res.message || 'Delete failed.', 'error');
    } catch (err) { showToast(err.message, 'error'); }
    finally { hideLoading(); }
  };
}
