/* ============================================================================
   OWLAPP CREATOR HUB — APP.JS (Core Global)
   ============================================================================
   Seções:
   1. Config (API_BASE_URL, localStorage)
   2. Tema (dark/light, persiste)
   3. Sidebar (recolhível, mobile, geração dinâmica)
   4. Header (geração dinâmica)
   5. Auth Guard (proteção de rotas, session)
   6. API Wrapper (apiGet, apiPost, apiPut, apiDelete)
   7. Toast (showToast)
   8. Formatadores (currency, date, phone, cpf, cnpj, etc)
   9. Máscaras (maskInput, unmask, parseCurrency)
   10. Utils (debounce, escapeHtml, readImageAsBase64, etc)
   11. SVG Icons
   ============================================================================ */

/* ============================================================================
   1. CONFIG
   ============================================================================ */
const API_BASE_URL = localStorage.getItem('owlapp_api_url') || 'https://SEU-SPACE.hf.space';

function getConfig() {
    try {
        const raw = localStorage.getItem('owlapp_config');
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function saveConfig(config) {
    try {
        const current = getConfig();
        const merged = { ...current, ...config };
        localStorage.setItem('owlapp_config', JSON.stringify(merged));
        return merged;
    } catch (e) {
        console.error('Erro ao salvar config:', e);
        return {};
    }
}

/* ============================================================================
   2. TEMA (dark padrão, light alternativo)
   ============================================================================ */
function initTheme() {
    const saved = localStorage.getItem('owlapp_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon();
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('owlapp_theme', next);
    updateThemeIcon();
}

function updateThemeIcon() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const btns = document.querySelectorAll('.theme-toggle');
    btns.forEach(function(btn) {
        if (theme === 'dark') {
            btn.innerHTML = SVG_ICONS.sun;
            btn.setAttribute('aria-label', 'Ativar modo claro');
        } else {
            btn.innerHTML = SVG_ICONS.moon;
            btn.setAttribute('aria-label', 'Ativar modo escuro');
        }
    });
}

/* ============================================================================
   3. SIDEBAR
   ============================================================================ */
const SIDEBAR_PAGES = [
    { section: 'PRINCIPAL' },
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'grid' },
    { id: 'create-app', label: 'Criar App', href: 'create-app.html', icon: 'plus' },
    { section: 'ASSINATURA' },
    { id: 'billing', label: 'Planos', href: 'billing.html', icon: 'creditCard' },
    { id: 'assinatura', label: 'Minha Assinatura', href: 'assinatura.html', icon: 'crown' },
];

const SIDEBAR_ADMIN_PAGES = [
    { section: 'ADMIN' },
    { id: 'admin', label: 'Dashboard Admin', href: 'admin.html', icon: 'shield' },
    { id: 'admin-users', label: 'Usuários', href: 'admin-users.html', icon: 'users' },
    { id: 'admin-subscribers', label: 'Assinantes', href: 'admin-subscribers.html', icon: 'star' },
];

function initSidebar() {
    const saved = localStorage.getItem('owlapp_sidebar_collapsed');
    if (saved === 'true') {
        document.body.classList.add('sidebar-collapsed');
    }

    // Fechar sidebar mobile ao clicar no overlay
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            closeMobileSidebar();
        });
    }

    // ESC fecha sidebar mobile
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeMobileSidebar();
        }
    });
}

function toggleSidebar() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        toggleMobileSidebar();
    } else {
        document.body.classList.toggle('sidebar-collapsed');
        const collapsed = document.body.classList.contains('sidebar-collapsed');
        localStorage.setItem('owlapp_sidebar_collapsed', collapsed);
    }
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
        closeMobileSidebar();
    } else {
        sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function generateSidebar(activePage) {
    const sidebarEl = document.getElementById('sidebar');
    if (!sidebarEl) return;

    const session = getSession();
    const isAdmin = session && session.roles && session.roles.includes('admin');

    let pages = [...SIDEBAR_PAGES];
    if (isAdmin) {
        pages = pages.concat(SIDEBAR_ADMIN_PAGES);
    }

    let html = '';

    // Header
    html += '<div class="sidebar-header">';
    html += '<img src="brand/owlapp-logo.png" alt="OwlApp" class="sidebar-logo" onerror="this.style.display=\'none\'">';
    html += '<span class="sidebar-brand">OwlApp</span>';
    html += '</div>';

    // Toggle button
    html += '<button class="sidebar-toggle" onclick="toggleSidebar()" aria-label="Recolher sidebar">';
    html += SVG_ICONS.chevronLeft;
    html += '</button>';

    // Nav
    html += '<nav class="sidebar-nav">';
    for (let i = 0; i < pages.length; i++) {
        const item = pages[i];
        if (item.section) {
            html += '<div class="sidebar-section-title">' + escapeHtml(item.section) + '</div>';
        } else {
            const isActive = activePage === item.id ? ' active' : '';
            const icon = SVG_ICONS[item.icon] || SVG_ICONS.grid;
            html += '<a href="' + item.href + '" class="sidebar-nav-item' + isActive + '">';
            html += '<span class="sidebar-nav-icon">' + icon + '</span>';
            html += '<span class="sidebar-nav-label">' + escapeHtml(item.label) + '</span>';
            html += '</a>';
        }
    }
    html += '</nav>';

    // Footer
    html += '<div class="sidebar-footer">';
    html += '<a href="#" class="sidebar-nav-item" onclick="handleLogout(event)">';
    html += '<span class="sidebar-nav-icon">' + SVG_ICONS.logOut + '</span>';
    html += '<span class="sidebar-nav-label">Sair</span>';
    html += '</a>';
    html += '</div>';

    sidebarEl.innerHTML = html;
}

function generateHeader(title) {
    const headerEl = document.getElementById('mainHeader');
    if (!headerEl) return;

    const session = getSession();
    const userName = (session && session.name) || (session && session.email) || '';
    const initial = userName ? userName.charAt(0).toUpperCase() : '?';

    let html = '';

    // Left
    html += '<div class="header-left">';
    html += '<button class="header-mobile-toggle" onclick="toggleMobileSidebar()" aria-label="Abrir menu">';
    html += SVG_ICONS.menu;
    html += '</button>';
    html += '<h1 class="header-title">' + escapeHtml(title) + '</h1>';
    html += '</div>';

    // Right
    html += '<div class="header-right">';
    html += '<button class="theme-toggle" onclick="toggleTheme()" aria-label="Alternar tema">';
    html += SVG_ICONS.sun;
    html += '</button>';
    html += '<div class="header-user">';
    html += '<div class="header-avatar">' + escapeHtml(initial) + '</div>';
    html += '<span class="header-user-name">' + escapeHtml(userName) + '</span>';
    html += '</div>';
    html += '</div>';

    headerEl.innerHTML = html;
}

/* ============================================================================
   4. AUTH GUARD / SESSION
   ============================================================================ */
function getSession() {
    try {
        const raw = localStorage.getItem('owlapp_session');
        if (!raw) return null;
        const session = JSON.parse(raw);
        if (!session || !session.access_token || !session.user) return null;
        return session;
    } catch (e) {
        return null;
    }
}

function saveSession(data) {
    try {
        const session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token || null,
            user: data.user,
            name: (data.user && data.user.name) || '',
            email: (data.user && data.user.email) || '',
            roles: data.roles || [],
            saved_at: new Date().toISOString()
        };
        localStorage.setItem('owlapp_session', JSON.stringify(session));
        return session;
    } catch (e) {
        console.error('Erro ao salvar sessão:', e);
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('owlapp_session');
}

function getAuthToken() {
    const session = getSession();
    return session ? session.access_token : null;
}

function requireAuth() {
    const session = getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function requireAdmin() {
    const session = getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    if (!session.roles || !session.roles.includes('admin')) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

async function validateSession() {
    const token = getAuthToken();
    if (!token) return false;
    try {
        const resp = await apiGet('/api/auth/session');
        if (resp.success && resp.data && resp.data.valid) {
            return true;
        }
        clearSession();
        return false;
    } catch (e) {
        return false;
    }
}

async function loadUserProfile() {
    try {
        const resp = await apiGet('/api/auth/me');
        if (resp.success && resp.data) {
            const session = getSession();
            if (session) {
                session.name = resp.data.name || session.email;
                session.email = resp.data.email || session.email;
                session.roles = resp.data.roles || [];
                session.subscription = resp.data.subscription || null;
                localStorage.setItem('owlapp_session', JSON.stringify(session));
            }
            return resp.data;
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function handleLogout(event) {
    if (event) event.preventDefault();
    try {
        await apiPost('/api/auth/logout', {});
    } catch (e) {
        // Ignora erro
    }
    clearSession();
    window.location.href = 'login.html';
}

/* ============================================================================
   5. PUBLIC APP SESSION (Nível 3 — Usuário final)
   ============================================================================ */
function getPublicAppSession(slug) {
    try {
        const raw = localStorage.getItem('owlapp-session-' + slug);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function savePublicAppSession(slug, data) {
    try {
        const session = {
            user_id: data.user_id,
            email: data.email,
            status: data.status,
            role: data.role || 'user',
            appSlug: slug,
            odlUserId: data.user_id,
            saved_at: new Date().toISOString()
        };
        localStorage.setItem('owlapp-session-' + slug, JSON.stringify(session));
        return session;
    } catch (e) {
        console.error('Erro ao salvar sessão pública:', e);
        return null;
    }
}

function clearPublicAppSession(slug) {
    localStorage.removeItem('owlapp-session-' + slug);
}

function getPublicAppToken(slug) {
    const session = getPublicAppSession(slug);
    return session ? JSON.stringify(session) : null;
}

/* ============================================================================
   6. API WRAPPER
   ============================================================================ */
async function apiRequest(method, path, body, customHeaders) {
    const url = API_BASE_URL + path;
    const headers = {
        'Content-Type': 'application/json',
        ...(customHeaders || {})
    };

    // Adicionar auth token se existir
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }

    const options = {
        method: method,
        headers: headers,
        mode: 'cors'
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);

        // Tentar parsear JSON
        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            data = { success: false, error: text || 'Resposta inválida do servidor' };
        }

        // Se 401, limpar sessão e redirecionar
        if (response.status === 401) {
            clearSession();
            if (!window.location.pathname.includes('login') && !window.location.pathname.includes('public-app')) {
                window.location.href = 'login.html';
            }
            return data;
        }

        return data;
    } catch (error) {
        console.error('API Error:', method, path, error);
        return { success: false, error: 'Erro de conexão com o servidor' };
    }
}

async function apiGet(path, customHeaders) {
    return apiRequest('GET', path, null, customHeaders);
}

async function apiPost(path, body, customHeaders) {
    return apiRequest('POST', path, body, customHeaders);
}

async function apiPut(path, body, customHeaders) {
    return apiRequest('PUT', path, body, customHeaders);
}

async function apiDelete(path, customHeaders) {
    return apiRequest('DELETE', path, null, customHeaders);
}

/* API para rotas públicas de app (com X-App-User-Token) */
async function publicApiGet(path, slug) {
    const headers = {};
    const token = getPublicAppToken(slug);
    if (token) {
        headers['X-App-User-Token'] = token;
    }
    return apiRequest('GET', path, null, headers);
}

async function publicApiPost(path, body, slug) {
    const headers = {};
    const token = getPublicAppToken(slug);
    if (token) {
        headers['X-App-User-Token'] = token;
    }
    return apiRequest('POST', path, body, headers);
}

/* ============================================================================
   7. TOAST
   ============================================================================ */
function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastId = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    let iconSvg = '';
    switch (type) {
        case 'success':
            iconSvg = SVG_ICONS.checkCircle;
            break;
        case 'error':
            iconSvg = SVG_ICONS.alertCircle;
            break;
        case 'warning':
            iconSvg = SVG_ICONS.alertTriangle;
            break;
        default:
            iconSvg = SVG_ICONS.info;
            break;
    }

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.id = toastId;
    toast.innerHTML =
        '<div class="toast-icon">' + iconSvg + '</div>' +
        '<div class="toast-content">' +
        '<div class="toast-message">' + escapeHtml(message) + '</div>' +
        '</div>' +
        '<button class="toast-close" onclick="removeToast(\'' + toastId + '\')" aria-label="Fechar">' +
        SVG_ICONS.x +
        '</button>' +
        '<div class="toast-progress"></div>';

    container.appendChild(toast);

    // Auto dismiss após 4s
    setTimeout(function() {
        removeToast(toastId);
    }, 4000);
}

function removeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (!toast) return;
    toast.classList.add('removing');
    setTimeout(function() {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 250);
}

/* ============================================================================
   8. FORMATADORES
   ============================================================================ */
function formatCurrency(value) {
    if (value === null || value === undefined || value === '') return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'R$ 0,00';
    return 'R$ ' + num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return day + '/' + month + '/' + year;
    } catch (e) {
        return '-';
    }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return day + '/' + month + '/' + year + ' ' + hours + ':' + mins;
    } catch (e) {
        return '-';
    }
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    } catch (e) {
        return '';
    }
}

function formatFileDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return year + month + day + '_' + hours + mins;
}

function formatPhone(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 2) return '(' + digits;
    if (digits.length <= 6) return '(' + digits.substring(0, 2) + ') ' + digits.substring(2);
    if (digits.length <= 10) return '(' + digits.substring(0, 2) + ') ' + digits.substring(2, 6) + '-' + digits.substring(6);
    return '(' + digits.substring(0, 2) + ') ' + digits.substring(2, 7) + '-' + digits.substring(7, 11);
}

function formatCEP(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return digits.substring(0, 5) + '-' + digits.substring(5, 8);
}

function formatCPF(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.substring(0, 3) + '.' + digits.substring(3);
    if (digits.length <= 9) return digits.substring(0, 3) + '.' + digits.substring(3, 6) + '.' + digits.substring(6);
    return digits.substring(0, 3) + '.' + digits.substring(3, 6) + '.' + digits.substring(6, 9) + '-' + digits.substring(9, 11);
}

function formatCNPJ(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return digits.substring(0, 2) + '.' + digits.substring(2);
    if (digits.length <= 8) return digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5);
    if (digits.length <= 12) return digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/' + digits.substring(8);
    return digits.substring(0, 2) + '.' + digits.substring(2, 5) + '.' + digits.substring(5, 8) + '/' + digits.substring(8, 12) + '-' + digits.substring(12, 14);
}

function formatCPFCNPJ(value) {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length <= 11) return formatCPF(value);
    return formatCNPJ(value);
}

function formatNumber(value) {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('pt-BR');
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const d = new Date(dateStr);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return Math.floor(diff / 60) + 'min';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd';
    return formatDate(dateStr);
}

/* ============================================================================
   9. MÁSCARAS
   ============================================================================ */
function maskInput(element, tipo) {
    if (!element) return;
    element.addEventListener('input', function(e) {
        const value = e.target.value;
        switch (tipo) {
            case 'phone':
                e.target.value = formatPhone(value);
                break;
            case 'cep':
                e.target.value = formatCEP(value);
                break;
            case 'cpf':
                e.target.value = formatCPF(value);
                break;
            case 'cnpj':
                e.target.value = formatCNPJ(value);
                break;
            case 'cpfcnpj':
                e.target.value = formatCPFCNPJ(value);
                break;
            case 'currency':
                e.target.value = maskCurrency(value);
                break;
        }
    });
}

function maskCurrency(value) {
    let digits = String(value).replace(/\D/g, '');
    if (!digits) return '';
    digits = digits.replace(/^0+/, '') || '0';
    while (digits.length < 3) digits = '0' + digits;
    const intPart = digits.substring(0, digits.length - 2);
    const decPart = digits.substring(digits.length - 2);
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return formatted + ',' + decPart;
}

function unmask(value) {
    if (!value) return '';
    return String(value).replace(/\D/g, '');
}

function parseCurrency(value) {
    if (!value) return 0;
    const cleaned = String(value).replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

/* ============================================================================
   10. UTILS
   ============================================================================ */
function debounce(fn, delay) {
    let timer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timer);
        timer = setTimeout(function() {
            fn.apply(context, args);
        }, delay);
    };
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
}

function readImageAsBase64(file, maxSizeMB) {
    maxSizeMB = maxSizeMB || 2;
    return new Promise(function(resolve, reject) {
        if (!file) {
            reject(new Error('Nenhum arquivo'));
            return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            reject(new Error('Arquivo maior que ' + maxSizeMB + 'MB'));
            return;
        }
        if (!file.type.startsWith('image/')) {
            reject(new Error('Arquivo não é uma imagem'));
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function() {
            reject(new Error('Erro ao ler arquivo'));
        };
        reader.readAsDataURL(file);
    });
}

function getToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function getDatePlusDays(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

function setUrlParam(name, value) {
    const url = new URL(window.location.href);
    if (value) {
        url.searchParams.set(name, value);
    } else {
        url.searchParams.delete(name);
    }
    window.history.replaceState({}, '', url.toString());
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('Copiado!', 'success');
        }).catch(function() {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copiado!', 'success');
    } catch (e) {
        showToast('Erro ao copiar', 'error');
    }
    document.body.removeChild(textarea);
}

function slugify(text) {
    return String(text)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

/* Modal helpers */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // ESC fecha
    const handler = function(e) {
        if (e.key === 'Escape') {
            closeModal(modalId);
            document.removeEventListener('keydown', handler);
        }
    };
    document.addEventListener('keydown', handler);
    modal._escHandler = handler;

    // Click no backdrop fecha
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (modal._escHandler) {
        document.removeEventListener('keydown', modal._escHandler);
    }
}

/* Disable/enable button (proteção duplo-clique) */
function disableBtn(btn, text) {
    if (!btn) return;
    btn.disabled = true;
    btn._originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner spinner-sm"></div> ' + escapeHtml(text || 'Salvando...');
}

function enableBtn(btn) {
    if (!btn) return;
    btn.disabled = false;
    if (btn._originalText) {
        btn.innerHTML = btn._originalText;
    }
}

/* ============================================================================
   11. SVG ICONS (inline, sem dependência externa)
   ============================================================================ */
const SVG_ICONS = {
    // Navigation
    grid: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    creditCard: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    crown: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-5 4-5-6-5 6z"/><path d="M3 20h18"/></svg>',
    shield: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    users: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    star: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',

    // Actions
    edit: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>',
    copy: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
    externalLink: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
    search: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    filter: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    save: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
    upload: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>',
    download: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',

    // UI
    chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    chevronDown: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>',
    chevronUp: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>',
    x: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    menu: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    moreVertical: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
    eye: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',

    // Theme
    sun: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    moon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',

    // Status / Toast
    checkCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    alertCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    alertTriangle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',

    // Content types
    smartphone: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    video: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    image: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    music: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
    code: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    link: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
    lock: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
    unlock: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 019.9-1"/></svg>',

    // App features
    newspaper: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8z"/></svg>',
    messageCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>',
    bell: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    plug: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 01-12 0V8z"/></svg>',
    globe: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>',
    settings: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
    barChart: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
    home: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    user: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    mail: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
    arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    package: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    layers: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
    palette: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"/></svg>',
    whatsapp: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    move: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
};
/* ============================================================
   js/apps.js – OwlApp Apps Listing Page
   ============================================================ */

const AppsPage = (() => {

    // ── State ──────────────────────────────────────────────
    let apps = [];
    let filteredApps = [];
    let total = 0;
    let deleteId = null;
    let deleteName = '';
    let cloneId = null;
    let cloneName = '';
    let currentView = 'grid'; // 'grid' | 'list'

    // Pagination
    let currentPage = 1;
    const pageSize = 12;

    // Search
    let searchTerm = '';
    let filterStatus = '';

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Meus Apps');
        initSidebar();
        initSearch();
        restoreView();
        loadApps();
    }

    // ── Search ─────────────────────────────────────────────

    function initSearch() {
        const input = document.getElementById('searchInput');
        if (input) {
            input.addEventListener('input', debounce(() => {
                searchTerm = input.value.trim().toLowerCase();
                currentPage = 1;
                applyFilters();
            }, 400));
        }
    }

    // ── Filter Change ──────────────────────────────────────

    function handleFilterChange() {
        const select = document.getElementById('filterStatus');
        filterStatus = select ? select.value : '';
        currentPage = 1;
        applyFilters();
    }

    // ── Clear Filters ──────────────────────────────────────

    function clearFilters() {
        const input = document.getElementById('searchInput');
        const select = document.getElementById('filterStatus');
        if (input) input.value = '';
        if (select) select.value = '';
        searchTerm = '';
        filterStatus = '';
        currentPage = 1;
        applyFilters();
    }

    // ── Apply Filters (client-side) ────────────────────────

    function applyFilters() {
        filteredApps = apps.filter(app => {
            // Search
            if (searchTerm) {
                const name = (app.app_name || '').toLowerCase();
                const desc = (app.description || '').toLowerCase();
                const slug = (app.primary_slug || app.slug || '').toLowerCase();
                if (!name.includes(searchTerm) && !desc.includes(searchTerm) && !slug.includes(searchTerm)) {
                    return false;
                }
            }
            // Status
            if (filterStatus === 'published' && !app.published) return false;
            if (filterStatus === 'draft' && app.published) return false;

            return true;
        });

        renderView();
    }

    // ── Load Apps ──────────────────────────────────────────

    async function loadApps() {
        const spinner = document.getElementById('appsSpinner');
        const empty = document.getElementById('appsEmpty');
        const noResults = document.getElementById('appsNoResults');
        const grid = document.getElementById('appsGrid');
        const listWrapper = document.getElementById('appsListWrapper');
        const pagination = document.getElementById('pagination');

        showEl(spinner);
        hideEl(empty);
        hideEl(noResults);
        hideEl(grid);
        hideEl(listWrapper);
        hideEl(pagination);

        try {
            const res = await apiGet('/api/apps?limit=200');

            if (res.success) {
                apps = res.data || [];
                total = res.total || apps.length;

                hideEl(spinner);
                updateCountText();

                if (apps.length === 0) {
                    showEl(empty);
                } else {
                    applyFilters();
                }
            } else {
                hideEl(spinner);
                showEl(empty);
                showToast(res.error || 'Erro ao carregar apps', 'error');
            }
        } catch (err) {
            hideEl(spinner);
            showEl(empty);
            showToast('Erro de conexão ao carregar apps', 'error');
        }
    }

    // ── Update Count Text ──────────────────────────────────

    function updateCountText() {
        const el = document.getElementById('appsCountText');
        if (el) {
            el.textContent = `${total} app${total !== 1 ? 's' : ''} criado${total !== 1 ? 's' : ''}`;
        }
    }

    // ── Render View ────────────────────────────────────────

    function renderView() {
        const empty = document.getElementById('appsEmpty');
        const noResults = document.getElementById('appsNoResults');
        const grid = document.getElementById('appsGrid');
        const listWrapper = document.getElementById('appsListWrapper');
        const pagination = document.getElementById('pagination');

        hideEl(empty);
        hideEl(noResults);
        hideEl(grid);
        hideEl(listWrapper);
        hideEl(pagination);

        if (filteredApps.length === 0) {
            if (searchTerm || filterStatus) {
                showEl(noResults);
            } else {
                showEl(empty);
            }
            return;
        }

        // Paginate
        const totalPages = Math.ceil(filteredApps.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const pageApps = filteredApps.slice(start, start + pageSize);

        if (currentView === 'grid') {
            renderGrid(pageApps);
            showEl(grid);
        } else {
            renderList(pageApps);
            showEl(listWrapper);
        }

        if (totalPages > 1) {
            renderPagination(totalPages);
            showEl(pagination);
        }
    }

    // ── Render Grid ────────────────────────────────────────

    function renderGrid(pageApps) {
        const grid = document.getElementById('appsGrid');
        if (!grid) return;

        grid.innerHTML = pageApps.map(app => buildAppCard(app)).join('');
    }

    function buildAppCard(app) {
        const iconUrl = app.app_icon_url ? escapeHtml(app.app_icon_url) : null;
        const statusClass = app.published ? 'badge-success' : 'badge-warning';
        const statusText = app.published ? 'Publicado' : 'Rascunho';
        const primarySlug = app.primary_slug || app.slug || '';
        const appUrl = primarySlug ? `/app/${primarySlug}` : '';
        const id = escapeHtml(app.id);
        const name = escapeHtml(app.app_name || 'Sem nome');

        return `
            <div class="app-card" data-app-id="${id}">
                <div class="app-card-header">
                    <div class="app-card-icon">
                        ${iconUrl
                            ? `<img src="${iconUrl}" alt="${name}" class="app-card-icon-img">`
                            : `<div class="app-card-icon-placeholder" style="background:${escapeHtml(app.primary_color || '#7c3aed')}">${escapeHtml((app.app_name || 'A').charAt(0).toUpperCase())}</div>`
                        }
                    </div>
                    <div class="app-card-info">
                        <h3 class="app-card-name">${name}</h3>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="app-card-actions">
                        <button class="btn btn-ghost btn-icon btn-sm" title="Opções" onclick="AppsPage.toggleAppMenu('${id}')">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                        </button>
                        <div class="dropdown-menu" id="appMenu_${id}">
                            <a href="app-editor.html?id=${id}" class="dropdown-item">
                                ${SVG_ICONS.edit || ''} Editar
                            </a>
                            <a href="app-modules.html?id=${id}" class="dropdown-item">
                                ${SVG_ICONS.layers || ''} Módulos
                            </a>
                            <a href="app-users.html?id=${id}" class="dropdown-item">
                                ${SVG_ICONS.users || ''} Usuários
                            </a>
                            ${appUrl ? `
                            <button class="dropdown-item" onclick="AppsPage.copyAppLink('${escapeHtml(primarySlug)}')">
                                ${SVG_ICONS.link || ''} Copiar Link
                            </button>
                            <a href="${appUrl}" target="_blank" class="dropdown-item">
                                ${SVG_ICONS.externalLink || ''} Abrir App
                            </a>` : ''}
                            <button class="dropdown-item" onclick="AppsPage.openCloneModal('${id}', '${name}')">
                                ${SVG_ICONS.copy || ''} Clonar
                            </button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item dropdown-item-danger" onclick="AppsPage.openDeleteModal('${id}', '${name}')">
                                ${SVG_ICONS.trash || ''} Excluir
                            </button>
                        </div>
                    </div>
                </div>
                <div class="app-card-stats">
                    <div class="app-card-stat">
                        ${SVG_ICONS.users || ''}
                        <span>${formatNumber(app.total_users || 0)}</span>
                    </div>
                    <div class="app-card-stat">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        <span>${formatNumber(app.views_count || 0)}</span>
                    </div>
                    <div class="app-card-stat">
                        ${SVG_ICONS.layers || ''}
                        <span>${app.modules_count || 0}</span>
                    </div>
                </div>
                ${app.description ? `<p class="app-card-desc">${escapeHtml(truncate(app.description, 100))}</p>` : ''}
                <div class="app-card-footer">
                    <a href="app-editor.html?id=${id}" class="btn btn-primary btn-sm">Gerenciar</a>
                    ${appUrl ? `<a href="${appUrl}" target="_blank" class="btn btn-ghost btn-sm">Abrir</a>` : ''}
                </div>
            </div>
        `;
    }

    // ── Render List ────────────────────────────────────────

    function renderList(pageApps) {
        const tbody = document.getElementById('appsTableBody');
        if (!tbody) return;

        tbody.innerHTML = pageApps.map(app => {
            const iconUrl = app.app_icon_url ? escapeHtml(app.app_icon_url) : null;
            const statusClass = app.published ? 'badge-success' : 'badge-warning';
            const statusText = app.published ? 'Publicado' : 'Rascunho';
            const id = escapeHtml(app.id);
            const name = escapeHtml(app.app_name || 'Sem nome');
            const primarySlug = app.primary_slug || app.slug || '';

            return `
                <tr data-app-id="${id}">
                    <td>
                        <div class="table-cell-app">
                            <div class="app-card-icon">
                                ${iconUrl
                                    ? `<img src="${iconUrl}" alt="${name}" class="app-card-icon-img" style="width:36px;height:36px;">`
                                    : `<div class="app-card-icon-placeholder" style="width:36px;height:36px;font-size:0.875rem;background:${escapeHtml(app.primary_color || '#7c3aed')}">${escapeHtml((app.app_name || 'A').charAt(0).toUpperCase())}</div>`
                                }
                            </div>
                            <div>
                                <span class="table-cell-name">${name}</span>
                                ${primarySlug ? `<span class="table-cell-slug">${escapeHtml(primarySlug)}</span>` : ''}
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td>${formatNumber(app.total_users || 0)}</td>
                    <td>${formatNumber(app.views_count || 0)}</td>
                    <td>${app.modules_count || 0}</td>
                    <td class="text-muted">${formatDate(app.created_at)}</td>
                    <td>
                        <div class="table-actions">
                            <a href="app-editor.html?id=${id}" class="btn btn-ghost btn-icon btn-sm" title="Editar">
                                ${SVG_ICONS.edit || ''}
                            </a>
                            <button class="btn btn-ghost btn-icon btn-sm" title="Clonar" onclick="AppsPage.openCloneModal('${id}', '${name}')">
                                ${SVG_ICONS.copy || ''}
                            </button>
                            <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Excluir" onclick="AppsPage.openDeleteModal('${id}', '${name}')">
                                ${SVG_ICONS.trash || ''}
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ── Pagination ─────────────────────────────────────────

    function renderPagination(totalPages) {
        const info = document.getElementById('paginationInfo');
        const pages = document.getElementById('paginationPages');
        const btnPrev = document.getElementById('btnPrevPage');
        const btnNext = document.getElementById('btnNextPage');

        if (info) {
            const start = (currentPage - 1) * pageSize + 1;
            const end = Math.min(currentPage * pageSize, filteredApps.length);
            info.textContent = `${start}–${end} de ${filteredApps.length}`;
        }

        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;

        if (pages) {
            pages.innerHTML = buildPageButtons(totalPages);
        }
    }

    function buildPageButtons(totalPages) {
        const buttons = [];
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            buttons.push(`<button class="pagination-btn" onclick="AppsPage.goToPage(1)">1</button>`);
            if (startPage > 2) {
                buttons.push(`<span class="pagination-ellipsis">…</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? ' active' : '';
            buttons.push(`<button class="pagination-btn${activeClass}" onclick="AppsPage.goToPage(${i})">${i}</button>`);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons.push(`<span class="pagination-ellipsis">…</span>`);
            }
            buttons.push(`<button class="pagination-btn" onclick="AppsPage.goToPage(${totalPages})">${totalPages}</button>`);
        }

        return buttons.join('');
    }

    function goToPage(page) {
        currentPage = page;
        renderView();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function prevPage() {
        if (currentPage > 1) goToPage(currentPage - 1);
    }

    function nextPage() {
        const totalPages = Math.ceil(filteredApps.length / pageSize);
        if (currentPage < totalPages) goToPage(currentPage + 1);
    }

    // ── View Toggle (Grid/List) ────────────────────────────

    function setView(view) {
        currentView = view;
        localStorage.setItem('owlapp_apps_view', view);

        const btnGrid = document.getElementById('btnViewGrid');
        const btnList = document.getElementById('btnViewList');

        if (btnGrid) btnGrid.classList.toggle('active', view === 'grid');
        if (btnList) btnList.classList.toggle('active', view === 'list');

        renderView();
    }

    function restoreView() {
        const saved = localStorage.getItem('owlapp_apps_view');
        if (saved === 'list' || saved === 'grid') {
            currentView = saved;
        }

        const btnGrid = document.getElementById('btnViewGrid');
        const btnList = document.getElementById('btnViewList');
        if (btnGrid) btnGrid.classList.toggle('active', currentView === 'grid');
        if (btnList) btnList.classList.toggle('active', currentView === 'list');
    }

    // ── App Menu (Dropdown) ────────────────────────────────

    function toggleAppMenu(appId) {
        document.querySelectorAll('.dropdown-menu.open').forEach(menu => {
            if (menu.id !== `appMenu_${appId}`) {
                menu.classList.remove('open');
            }
        });

        const menu = document.getElementById(`appMenu_${appId}`);
        if (menu) menu.classList.toggle('open');
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.app-card-actions') && !e.target.closest('.table-actions')) {
            document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
        }
    });

    // ── Copy Link ──────────────────────────────────────────

    function copyAppLink(slug) {
        const url = `${window.location.origin}/app/${slug}`;
        copyToClipboard(url);
        showToast('Link copiado!', 'success');
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    // ── Delete ─────────────────────────────────────────────

    function openDeleteModal(appId, appName) {
        deleteId = appId;
        deleteName = appName;
        const nameEl = document.getElementById('deleteAppName');
        if (nameEl) nameEl.textContent = appName;
        openModal('modalDeleteApp');
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    function closeDeleteModal() {
        deleteId = null;
        deleteName = '';
        closeModal('modalDeleteApp');
    }

    async function confirmDelete() {
        if (!deleteId) return;

        const btn = document.getElementById('btnConfirmDelete');
        disableBtn(btn, 'Excluindo...');

        try {
            const res = await apiDelete(`/api/apps/${deleteId}`);

            if (res.success) {
                showToast('App excluído com sucesso!', 'success');
                closeDeleteModal();
                // Remove from local state
                apps = apps.filter(a => a.id !== deleteId);
                total = apps.length;
                updateCountText();
                applyFilters();
            } else {
                showToast(res.error || 'Erro ao excluir', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Excluir');
        }
    }

    // ── Clone ──────────────────────────────────────────────

    function openCloneModal(appId, appName) {
        cloneId = appId;
        cloneName = appName;
        const nameEl = document.getElementById('cloneAppName');
        if (nameEl) nameEl.textContent = appName;
        openModal('modalCloneApp');
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    function closeCloneModal() {
        cloneId = null;
        cloneName = '';
        closeModal('modalCloneApp');
    }

    async function confirmClone() {
        if (!cloneId) return;

        const btn = document.getElementById('btnConfirmClone');
        disableBtn(btn, 'Clonando...');

        try {
            const res = await apiPost(`/api/apps/${cloneId}/clone`);

            if (res.success) {
                showToast('App clonado com sucesso!', 'success');
                closeCloneModal();
                await loadApps();
            } else {
                showToast(res.error || 'Erro ao clonar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Clonar');
        }
    }

    // ── Helpers ────────────────────────────────────────────

    function showEl(el) {
        if (el) el.style.display = '';
    }

    function hideEl(el) {
        if (el) el.style.display = 'none';
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        handleFilterChange,
        clearFilters,
        setView,
        toggleAppMenu,
        copyAppLink,
        openDeleteModal,
        closeDeleteModal,
        confirmDelete,
        openCloneModal,
        closeCloneModal,
        confirmClone,
        goToPage,
        prevPage,
        nextPage
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', AppsPage.init);

/* ============================================================================
   FIM DO APP.JS
   ============================================================================ */
