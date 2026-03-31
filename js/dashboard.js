/* ============================================================
   js/dashboard.js – OwlApp Creator Dashboard
   ============================================================ */

const DashboardPage = (() => {

    // ── State ──────────────────────────────────────────────
    let apps = [];
    let deleteId = null;
    let cloneId = null;
    let stats = {
        total_apps: 0,
        total_users: 0,
        total_views: 0,
        plan: 'basic'
    };

    // ── Plan Display Names ─────────────────────────────────
    const PLAN_DISPLAY = {
        basic: 'Basic',
        starter: 'Starter',
        professional: 'Professional',
        business: 'Business'
    };

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('dashboard');
        generateHeader('Dashboard');
        initSidebar();
        loadDashboardData();
    }

    // ── Load Data ──────────────────────────────────────────

    async function loadDashboardData() {
        await Promise.all([
            loadStats(),
            loadApps()
        ]);
    }

    // ── Stats ──────────────────────────────────────────────

    async function loadStats() {
        try {
            // Load subscription info
            const subRes = await apiGet('/api/subscription/status');
            if (subRes.success && subRes.data) {
                stats.plan = subRes.data.subscription_tier || 'basic';
            }
        } catch (e) {
            // Non-critical, keep default
        }

        updateStatsUI();
    }

    function updateStatsUI() {
        const totalAppsEl = document.getElementById('statTotalAppsValue');
        const totalUsersEl = document.getElementById('statTotalUsersValue');
        const totalViewsEl = document.getElementById('statTotalViewsValue');
        const planEl = document.getElementById('statPlanValue');

        if (totalAppsEl) totalAppsEl.textContent = formatNumber(stats.total_apps);
        if (totalUsersEl) totalUsersEl.textContent = formatNumber(stats.total_users);
        if (totalViewsEl) totalViewsEl.textContent = formatNumber(stats.total_views);
        if (planEl) {
            planEl.textContent = PLAN_DISPLAY[stats.plan] || 'Basic';
        }
    }

    // ── Apps ───────────────────────────────────────────────

    async function loadApps() {
        const spinner = document.getElementById('appsSpinner');
        const empty = document.getElementById('appsEmpty');
        const grid = document.getElementById('appsGrid');

        showElement(spinner);
        hideElement(empty);
        hideElement(grid);

        try {
            const res = await apiGet('/api/apps?limit=6');

            if (res.success) {
                apps = res.data || [];

                // Update stats from apps data
                stats.total_apps = res.total || apps.length;
                stats.total_users = apps.reduce((sum, a) => sum + (a.total_users || 0), 0);
                stats.total_views = apps.reduce((sum, a) => sum + (a.views_count || 0), 0);
                updateStatsUI();

                hideElement(spinner);

                if (apps.length === 0) {
                    showElement(empty);
                } else {
                    renderApps();
                    showElement(grid);
                }
            } else {
                hideElement(spinner);
                showElement(empty);
                showToast(res.error || 'Erro ao carregar apps', 'error');
            }
        } catch (err) {
            hideElement(spinner);
            showElement(empty);
            showToast('Erro de conexão ao carregar apps', 'error');
        }
    }

    function renderApps() {
        const grid = document.getElementById('appsGrid');
        if (!grid) return;

        grid.innerHTML = apps.map(app => {
            const iconUrl = app.app_icon_url
                ? escapeHtml(app.app_icon_url)
                : null;

            const statusClass = app.published ? 'badge-success' : 'badge-warning';
            const statusText = app.published ? 'Publicado' : 'Rascunho';

            const primarySlug = app.primary_slug || app.slug || '';
            const appUrl = primarySlug ? `${window.location.origin}/app/${primarySlug}` : '';

            return `
                <div class="app-card" data-app-id="${escapeHtml(app.id)}">
                    <div class="app-card-header">
                        <div class="app-card-icon">
                            ${iconUrl
                                ? `<img src="${iconUrl}" alt="${escapeHtml(app.app_name)}" class="app-card-icon-img">`
                                : `<div class="app-card-icon-placeholder" style="background:${escapeHtml(app.primary_color || '#7c3aed')}">${escapeHtml((app.app_name || 'A').charAt(0).toUpperCase())}</div>`
                            }
                        </div>
                        <div class="app-card-info">
                            <h3 class="app-card-name">${escapeHtml(app.app_name || 'Sem nome')}</h3>
                            <span class="badge ${statusClass}">${statusText}</span>
                        </div>
                        <div class="app-card-actions">
                            <button class="btn btn-ghost btn-icon btn-sm" title="Opções" onclick="DashboardPage.toggleAppMenu('${escapeHtml(app.id)}')">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                            </button>
                            <div class="dropdown-menu" id="appMenu_${escapeHtml(app.id)}">
                                <a href="app-editor.html?id=${escapeHtml(app.id)}" class="dropdown-item">
                                    ${SVG_ICONS.edit || ''} Editar
                                </a>
                                ${appUrl ? `
                                <button class="dropdown-item" onclick="DashboardPage.copyAppLink('${escapeHtml(primarySlug)}')">
                                    ${SVG_ICONS.link || ''} Copiar Link
                                </button>` : ''}
                                ${appUrl ? `
                                <a href="/app/${escapeHtml(primarySlug)}" target="_blank" class="dropdown-item">
                                    ${SVG_ICONS.externalLink || ''} Abrir App
                                </a>` : ''}
                                <button class="dropdown-item" onclick="DashboardPage.openCloneModal('${escapeHtml(app.id)}')">
                                    ${SVG_ICONS.copy || ''} Clonar
                                </button>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item dropdown-item-danger" onclick="DashboardPage.openDeleteModal('${escapeHtml(app.id)}')">
                                    ${SVG_ICONS.trash || ''} Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="app-card-stats">
                        <div class="app-card-stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            <span>${formatNumber(app.total_users || 0)}</span>
                        </div>
                        <div class="app-card-stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            <span>${formatNumber(app.views_count || 0)}</span>
                        </div>
                        <div class="app-card-stat">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                            <span>${app.modules_count || 0} módulos</span>
                        </div>
                    </div>
                    ${app.description ? `<p class="app-card-desc">${escapeHtml(truncate(app.description, 100))}</p>` : ''}
                    <div class="app-card-footer">
                        <a href="app-editor.html?id=${escapeHtml(app.id)}" class="btn btn-primary btn-sm">Gerenciar</a>
                        ${appUrl ? `<a href="/app/${escapeHtml(primarySlug)}" target="_blank" class="btn btn-ghost btn-sm">Abrir</a>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── App Menu (Dropdown) ────────────────────────────────

    function toggleAppMenu(appId) {
        // Close all other menus
        document.querySelectorAll('.dropdown-menu.open').forEach(menu => {
            if (menu.id !== `appMenu_${appId}`) {
                menu.classList.remove('open');
            }
        });

        const menu = document.getElementById(`appMenu_${appId}`);
        if (menu) {
            menu.classList.toggle('open');
        }
    }

    // Close menus on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.app-card-actions')) {
            document.querySelectorAll('.dropdown-menu.open').forEach(menu => {
                menu.classList.remove('open');
            });
        }
    });

    // ── Copy App Link ──────────────────────────────────────

    function copyAppLink(slug) {
        const url = `${window.location.origin}/app/${slug}`;
        copyToClipboard(url);
        showToast('Link copiado!', 'success');
        // Close dropdown
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    // ── Delete App ─────────────────────────────────────────

    function openDeleteModal(appId) {
        deleteId = appId;
        openModal('modalDeleteApp');
        // Close dropdown
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    function closeDeleteModal() {
        deleteId = null;
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
                await loadApps();
            } else {
                showToast(res.error || 'Erro ao excluir app', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Excluir');
        }
    }

    // ── Clone App ──────────────────────────────────────────

    function openCloneModal(appId) {
        cloneId = appId;
        openModal('modalCloneApp');
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }

    function closeCloneModal() {
        cloneId = null;
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
                showToast(res.error || 'Erro ao clonar app', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Clonar');
        }
    }

    // ── Helpers ────────────────────────────────────────────

    function showElement(el) {
        if (el) el.style.display = '';
    }

    function hideElement(el) {
        if (el) el.style.display = 'none';
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        toggleAppMenu,
        copyAppLink,
        openDeleteModal,
        closeDeleteModal,
        confirmDelete,
        openCloneModal,
        closeCloneModal,
        confirmClone
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', DashboardPage.init);
