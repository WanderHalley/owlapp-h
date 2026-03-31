/* ============================================================
   js/app-users.js – OwlApp App Users Management
   ============================================================ */

const UsersPage = (() => {

    // ── State ──────────────────────────────────────────────
    let appId = null;
    let users = [];
    let filteredUsers = [];
    let modules = [];
    let editingUser = null;
    let deleteId = null;
    let deleteName = '';

    // Pagination
    let currentPage = 1;
    const pageSize = 20;

    // Filters
    let searchTerm = '';
    let filterStatus = '';

    // ── Status Display ─────────────────────────────────────
    const STATUS_MAP = {
        approved: { label: 'Aprovado',  css: 'badge-success' },
        pending:  { label: 'Pendente',  css: 'badge-warning' },
        blocked:  { label: 'Bloqueado', css: 'badge-danger'  }
    };

    const ORIGIN_MAP = {
        manual:    'Manual',
        webhook:   'Webhook',
        hotmart:   'Hotmart',
        kiwify:    'Kiwify',
        eduzz:     'Eduzz',
        monetizze: 'Monetizze',
        braip:     'Braip',
        self:      'Auto-cadastro'
    };

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Usuários');
        initSidebar();

        appId = getUrlParam('id');
        if (!appId) {
            showToast('App não encontrado', 'error');
            setTimeout(() => window.location.href = 'apps.html', 1000);
            return;
        }

        updateBreadcrumb();
        initSearch();
        initMasks();
        loadUsers();
    }

    // ── Breadcrumb ─────────────────────────────────────────

    function updateBreadcrumb() {
        const link = document.getElementById('breadcrumbAppLink');
        if (link) link.href = `app-editor.html?id=${appId}`;
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

    function handleFilterChange() {
        const sel = document.getElementById('filterStatus');
        filterStatus = sel ? sel.value : '';
        currentPage = 1;
        applyFilters();
    }

    function clearFilters() {
        const input = document.getElementById('searchInput');
        const sel = document.getElementById('filterStatus');
        if (input) input.value = '';
        if (sel) sel.value = '';
        searchTerm = '';
        filterStatus = '';
        currentPage = 1;
        applyFilters();
    }

    // ── Masks ──────────────────────────────────────────────

    function initMasks() {
        document.querySelectorAll('[data-mask="phone"]').forEach(input => {
            maskInput(input, 'phone');
        });
    }

    // ── Load Users ─────────────────────────────────────────

    async function loadUsers() {
        const spinner = document.getElementById('usersSpinner');
        const empty = document.getElementById('usersEmpty');
        const noResults = document.getElementById('usersNoResults');
        const tableWrapper = document.getElementById('usersTableWrapper');
        const pagination = document.getElementById('pagination');

        showEl(spinner);
        hideEl(empty);
        hideEl(noResults);
        hideEl(tableWrapper);
        hideEl(pagination);

        try {
            const res = await apiGet(`/api/apps/${appId}/users?limit=500`);

            hideEl(spinner);

            if (res.success) {
                users = res.data || [];
                updateStats();
                updateCountText();

                if (users.length === 0) {
                    showEl(empty);
                } else {
                    applyFilters();
                }
            } else {
                showEl(empty);
                showToast(res.error || 'Erro ao carregar usuários', 'error');
            }
        } catch (err) {
            hideEl(spinner);
            showEl(empty);
            showToast('Erro de conexão', 'error');
        }
    }

    // ── Stats ──────────────────────────────────────────────

    function updateStats() {
        const approved = users.filter(u => u.status === 'approved').length;
        const pending = users.filter(u => u.status === 'pending').length;
        const blocked = users.filter(u => u.status === 'blocked').length;

        setTextContent('statApproved', approved);
        setTextContent('statPending', pending);
        setTextContent('statBlocked', blocked);
        setTextContent('statTotal', users.length);
    }

    function updateCountText() {
        const el = document.getElementById('usersCountText');
        if (el) el.textContent = `${users.length} usuário${users.length !== 1 ? 's' : ''}`;
    }

    // ── Filter ─────────────────────────────────────────────

    function applyFilters() {
        filteredUsers = users.filter(u => {
            if (searchTerm) {
                const name = (u.name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                if (!name.includes(searchTerm) && !email.includes(searchTerm) && !phone.includes(searchTerm)) {
                    return false;
                }
            }
            if (filterStatus && u.status !== filterStatus) return false;
            return true;
        });

        renderView();
    }

    // ── Render ─────────────────────────────────────────────

    function renderView() {
        const empty = document.getElementById('usersEmpty');
        const noResults = document.getElementById('usersNoResults');
        const tableWrapper = document.getElementById('usersTableWrapper');
        const pagination = document.getElementById('pagination');

        hideEl(empty);
        hideEl(noResults);
        hideEl(tableWrapper);
        hideEl(pagination);

        if (filteredUsers.length === 0) {
            if (searchTerm || filterStatus) {
                showEl(noResults);
            } else {
                showEl(empty);
            }
            return;
        }

        const totalPages = Math.ceil(filteredUsers.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages;
        const start = (currentPage - 1) * pageSize;
        const pageUsers = filteredUsers.slice(start, start + pageSize);

        renderTable(pageUsers);
        showEl(tableWrapper);

        if (totalPages > 1) {
            renderPagination(totalPages);
            showEl(pagination);
        }
    }

    function renderTable(pageUsers) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = pageUsers.map(u => {
            const id = escapeHtml(u.id);
            const name = escapeHtml(u.name || 'Sem nome');
            const email = escapeHtml(u.email || '');
            const phone = u.phone ? formatPhone(u.phone) : '-';
            const status = STATUS_MAP[u.status] || STATUS_MAP.pending;
            const origin = ORIGIN_MAP[u.origin] || u.origin || '-';
            const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();

            return `
                <tr data-user-id="${id}">
                    <td>
                        <div class="table-cell-user">
                            <div class="user-avatar-sm">${escapeHtml(initial)}</div>
                            <div>
                                <span class="table-cell-name">${name}</span>
                                <span class="table-cell-email">${email}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="badge ${status.css}">${status.label}</span></td>
                    <td class="text-muted">${escapeHtml(phone)}</td>
                    <td class="text-muted">${escapeHtml(origin)}</td>
                    <td class="text-muted">${formatDate(u.created_at)}</td>
                    <td>
                        <div class="table-actions">
                            ${u.status === 'pending' ? `
                            <button class="btn btn-success btn-icon btn-sm" title="Aprovar" onclick="UsersPage.quickApprove('${id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>` : ''}
                            ${u.status === 'approved' ? `
                            <button class="btn btn-ghost btn-icon btn-sm" title="Bloquear" onclick="UsersPage.quickBlock('${id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </button>` : ''}
                            ${u.status === 'blocked' ? `
                            <button class="btn btn-ghost btn-icon btn-sm" title="Desbloquear" onclick="UsersPage.quickApprove('${id}')">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                            </button>` : ''}
                            <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="UsersPage.openEditModal('${id}')">
                                ${SVG_ICONS.edit || ''}
                            </button>
                            <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Remover" onclick="UsersPage.openDeleteModal('${id}', '${name}')">
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
            const end = Math.min(currentPage * pageSize, filteredUsers.length);
            info.textContent = `${start}–${end} de ${filteredUsers.length}`;
        }
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;

        if (pages) {
            const btns = [];
            const maxV = 5;
            let sp = Math.max(1, currentPage - Math.floor(maxV / 2));
            let ep = Math.min(totalPages, sp + maxV - 1);
            if (ep - sp < maxV - 1) sp = Math.max(1, ep - maxV + 1);

            if (sp > 1) {
                btns.push(`<button class="pagination-btn" onclick="UsersPage.goToPage(1)">1</button>`);
                if (sp > 2) btns.push(`<span class="pagination-ellipsis">…</span>`);
            }
            for (let i = sp; i <= ep; i++) {
                btns.push(`<button class="pagination-btn${i === currentPage ? ' active' : ''}" onclick="UsersPage.goToPage(${i})">${i}</button>`);
            }
            if (ep < totalPages) {
                if (ep < totalPages - 1) btns.push(`<span class="pagination-ellipsis">…</span>`);
                btns.push(`<button class="pagination-btn" onclick="UsersPage.goToPage(${totalPages})">${totalPages}</button>`);
            }
            pages.innerHTML = btns.join('');
        }
    }

    function goToPage(p) { currentPage = p; renderView(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    function prevPage() { if (currentPage > 1) goToPage(currentPage - 1); }
    function nextPage() { const tp = Math.ceil(filteredUsers.length / pageSize); if (currentPage < tp) goToPage(currentPage + 1); }

    // ── Quick Actions ──────────────────────────────────────

    async function quickApprove(userId) {
        await updateUserStatus(userId, 'approved');
    }

    async function quickBlock(userId) {
        await updateUserStatus(userId, 'blocked');
    }

    async function updateUserStatus(userId, newStatus) {
        try {
            const res = await apiPut(`/api/apps/${appId}/users/${userId}`, { status: newStatus });
            if (res.success) {
                const u = users.find(x => x.id === userId);
                if (u) u.status = newStatus;
                updateStats();
                applyFilters();
                const label = STATUS_MAP[newStatus]?.label || newStatus;
                showToast(`Usuário ${label.toLowerCase()}!`, 'success');
            } else {
                showToast(res.error || 'Erro ao atualizar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    }

    // ── Add User ───────────────────────────────────────────

    function openAddModal() {
        setVal('addUserName', '');
        setVal('addUserEmail', '');
        setVal('addUserPhone', '');
        setVal('addUserStatus', 'approved');
        openModal('modalAddUser');
        document.getElementById('addUserName')?.focus();
    }

    async function saveNewUser() {
        const name = document.getElementById('addUserName')?.value.trim();
        const email = document.getElementById('addUserEmail')?.value.trim();
        const phone = unmask(document.getElementById('addUserPhone')?.value || '');
        const status = document.getElementById('addUserStatus')?.value || 'approved';

        if (!name || name.length < 2) { showToast('Informe o nome', 'warning'); return; }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Email inválido', 'warning'); return; }

        const btn = document.getElementById('btnSaveNewUser');
        disableBtn(btn, 'Adicionando...');

        try {
            const res = await apiPost(`/api/apps/${appId}/users`, {
                name,
                email,
                phone: phone || null,
                status
            });

            if (res.success) {
                showToast('Usuário adicionado!', 'success');
                closeModal('modalAddUser');
                await loadUsers();
            } else {
                showToast(res.error || 'Erro ao adicionar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Adicionar');
        }
    }

    // ── Edit User ──────────────────────────────────────────

    async function openEditModal(userId) {
        const u = users.find(x => x.id === userId);
        if (!u) return;

        editingUser = u;

        // Header
        const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
        const avatar = document.getElementById('editUserAvatar');
        const dispName = document.getElementById('editUserDisplayName');
        const dispEmail = document.getElementById('editUserDisplayEmail');

        if (avatar) avatar.textContent = initial;
        if (dispName) dispName.textContent = u.name || 'Sem nome';
        if (dispEmail) dispEmail.textContent = u.email || '';

        // Fields
        setVal('editUserName', u.name || '');
        setVal('editUserPhone', u.phone ? formatPhone(u.phone) : '');
        setVal('editUserStatus', u.status || 'pending');
        setVal('editUserNotes', u.notes || '');

        // Module access
        openModal('modalEditUser');
        loadModuleAccess(userId);
    }

    async function loadModuleAccess(userId) {
        const list = document.getElementById('moduleAccessList');
        const spinner = document.getElementById('moduleAccessSpinner');
        if (!list) return;

        list.innerHTML = '';
        if (spinner) list.appendChild(spinner);
        showEl(spinner);

        try {
            // Load modules
            const modsRes = await apiGet(`/api/apps/${appId}/modules`);
            modules = modsRes.success ? (modsRes.data || []) : [];

            // Load current access
            const accessRes = await apiGet(`/api/apps/${appId}/users/${userId}/access`);
            const accessModuleIds = (accessRes.success && accessRes.data)
                ? accessRes.data.map(a => a.module_id)
                : [];

            hideEl(spinner);

            if (modules.length === 0) {
                list.innerHTML = '<p class="text-muted">Nenhum módulo neste app.</p>';
                return;
            }

            list.innerHTML = modules.map(m => {
                const checked = accessModuleIds.includes(m.id) ? 'checked' : '';
                return `
                    <label class="module-access-item">
                        <input type="checkbox" class="form-checkbox module-access-checkbox" value="${escapeHtml(m.id)}" ${checked}>
                        <div class="module-access-info">
                            <span class="module-access-name">${escapeHtml(m.title || m.name || 'Módulo')}</span>
                            <span class="module-access-meta">${m.contents_count || 0} conteúdos</span>
                        </div>
                    </label>
                `;
            }).join('');
        } catch (err) {
            hideEl(spinner);
            list.innerHTML = '<p class="text-muted">Erro ao carregar módulos.</p>';
        }
    }

    async function saveEditUser() {
        if (!editingUser) return;

        const btn = document.getElementById('btnSaveEditUser');
        disableBtn(btn, 'Salvando...');

        const name = document.getElementById('editUserName')?.value.trim();
        const phone = unmask(document.getElementById('editUserPhone')?.value || '');
        const status = document.getElementById('editUserStatus')?.value;
        const notes = document.getElementById('editUserNotes')?.value.trim();

        // Collect module access
        const checkedModules = [];
        document.querySelectorAll('.module-access-checkbox:checked').forEach(cb => {
            checkedModules.push(cb.value);
        });

        try {
            // Update user info
            const userPayload = {
                name: name || null,
                phone: phone || null,
                status,
                notes: notes || null
            };

            const res = await apiPut(`/api/apps/${appId}/users/${editingUser.id}`, userPayload);

            if (res.success) {
                // Update module access
                await apiPut(`/api/apps/${appId}/users/${editingUser.id}/access`, {
                    module_ids: checkedModules
                });

                // Update local state
                const idx = users.findIndex(u => u.id === editingUser.id);
                if (idx !== -1) {
                    users[idx] = { ...users[idx], ...userPayload };
                }

                showToast('Usuário atualizado!', 'success');
                closeModal('modalEditUser');
                updateStats();
                applyFilters();
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar Alterações');
        }
    }

    // ── Delete User ────────────────────────────────────────

    function openDeleteModal(userId, userName) {
        deleteId = userId;
        deleteName = userName;
        const el = document.getElementById('deleteUserName');
        if (el) el.textContent = userName;
        openModal('modalDeleteUser');
    }

    async function confirmDelete() {
        if (!deleteId) return;
        const btn = document.getElementById('btnConfirmDeleteUser');
        disableBtn(btn, 'Removendo...');

        try {
            const res = await apiDelete(`/api/apps/${appId}/users/${deleteId}`);
            if (res.success) {
                showToast('Usuário removido!', 'success');
                closeModal('modalDeleteUser');
                users = users.filter(u => u.id !== deleteId);
                deleteId = null;
                updateStats();
                updateCountText();
                applyFilters();
            } else {
                showToast(res.error || 'Erro ao remover', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Remover');
        }
    }

    // ── Export CSV ──────────────────────────────────────────

    function exportCSV() {
        if (users.length === 0) {
            showToast('Nenhum usuário para exportar', 'warning');
            return;
        }

        const headers = ['Nome', 'Email', 'Telefone', 'Status', 'Origem', 'Cadastro'];
        const rows = users.map(u => [
            u.name || '',
            u.email || '',
            u.phone || '',
            u.status || '',
            u.origin || '',
            u.created_at || ''
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `usuarios-app-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('CSV exportado!', 'success');
    }

    // ── Helpers ────────────────────────────────────────────

    function showEl(el) { if (el) el.style.display = ''; }
    function hideEl(el) { if (el) el.style.display = 'none'; }
    function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
    function setTextContent(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        handleFilterChange,
        clearFilters,
        openAddModal,
        saveNewUser,
        openEditModal,
        saveEditUser,
        openDeleteModal,
        confirmDelete,
        quickApprove,
        quickBlock,
        exportCSV,
        goToPage,
        prevPage,
        nextPage
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', UsersPage.init);
