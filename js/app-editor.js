/* ============================================================
   js/app-editor.js – OwlApp App Editor
   ============================================================ */

const AppEditorPage = (() => {

    // ── State ──────────────────────────────────────────────
    let appId = null;
    let appData = null;
    let slugs = [];
    let domains = [];
    let currentTab = 'general';

    // Images changed flags
    let iconChanged = false;
    let logoChanged = false;
    let newIconBase64 = null;
    let newLogoBase64 = null;

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Editor do App');
        initSidebar();

        appId = getUrlParam('id');
        if (!appId) {
            showToast('App não encontrado', 'error');
            setTimeout(() => window.location.href = 'apps.html', 1000);
            return;
        }

        initColorListeners();
        initDescCounter();
        initPublishedToggle();
        initDeleteConfirm();
        initImageDropZones();

        loadApp();
    }

    // ── Load App ───────────────────────────────────────────

    async function loadApp() {
        const spinner = document.getElementById('editorSpinner');

        try {
            const res = await apiGet(`/api/apps/${appId}`);

            if (res.success && res.data) {
                appData = res.data;
                populateAll();
                if (spinner) spinner.style.display = 'none';
                showTab('general');
            } else {
                showToast(res.error || 'App não encontrado', 'error');
                setTimeout(() => window.location.href = 'apps.html', 1000);
            }
        } catch (err) {
            showToast('Erro ao carregar app', 'error');
        }
    }

    // ── Populate ───────────────────────────────────────────

    function populateAll() {
        if (!appData) return;

        // Page header
        const title = document.getElementById('pageTitle');
        const subtitle = document.getElementById('pageSubtitle');
        if (title) title.textContent = appData.app_name || 'Editor do App';
        if (subtitle) subtitle.textContent = appData.primary_slug || appData.slug || '';

        // Open App button
        const slug = appData.primary_slug || appData.slug || '';
        const btnOpen = document.getElementById('btnOpenApp');
        if (btnOpen && slug) {
            btnOpen.href = `/app/${slug}`;
            btnOpen.style.display = '';
        }

        populateGeneral();
        populateAppearance();
        populateQuickLinks();
        loadSlugs();
        loadDomains();
    }

    // ── General Tab ────────────────────────────────────────

    function populateGeneral() {
        setVal('editAppName', appData.app_name || '');
        setVal('editDescription', appData.description || '');
        setVal('editCategory', appData.category || '');
        setVal('editVisibility', appData.visibility || 'private');

        const published = document.getElementById('editPublished');
        const publishedText = document.getElementById('editPublishedText');
        if (published) {
            published.checked = !!appData.published;
            if (publishedText) publishedText.textContent = appData.published ? 'Publicado' : 'Rascunho';
        }

        // desc counter
        const counter = document.getElementById('editDescCount');
        if (counter) counter.textContent = (appData.description || '').length;
    }

    function initDescCounter() {
        const ta = document.getElementById('editDescription');
        const counter = document.getElementById('editDescCount');
        if (ta && counter) {
            ta.addEventListener('input', () => {
                counter.textContent = ta.value.length;
            });
        }
    }

    function initPublishedToggle() {
        const el = document.getElementById('editPublished');
        const text = document.getElementById('editPublishedText');
        if (el && text) {
            el.addEventListener('change', () => {
                text.textContent = el.checked ? 'Publicado' : 'Rascunho';
            });
        }
    }

    async function saveGeneral() {
        const name = document.getElementById('editAppName')?.value.trim();
        if (!name || name.length < 2) {
            showToast('Nome deve ter pelo menos 2 caracteres', 'warning');
            return;
        }

        const btn = document.getElementById('btnSaveGeneral');
        disableBtn(btn, 'Salvando...');

        const payload = {
            app_name: name,
            description: document.getElementById('editDescription')?.value.trim() || null,
            category: document.getElementById('editCategory')?.value || null,
            visibility: document.getElementById('editVisibility')?.value || 'private',
            published: document.getElementById('editPublished')?.checked || false
        };

        try {
            const res = await apiPut(`/api/apps/${appId}`, payload);
            if (res.success) {
                appData = { ...appData, ...payload };
                const title = document.getElementById('pageTitle');
                if (title) title.textContent = payload.app_name;
                showToast('Informações salvas!', 'success');
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar Alterações');
        }
    }

    // ── Quick Links ────────────────────────────────────────

    function populateQuickLinks() {
        const grid = document.getElementById('quickLinksGrid');
        if (!grid) return;

        const links = [
            { href: `app-modules.html?id=${appId}`, icon: 'layers', label: 'Módulos' },
            { href: `app-users.html?id=${appId}`, icon: 'users', label: 'Usuários' },
            { href: `app-feed.html?id=${appId}`, icon: 'newspaper', label: 'Feed' },
            { href: `app-community.html?id=${appId}`, icon: 'messageCircle', label: 'Comunidade' },
            { href: `app-notifications.html?id=${appId}`, icon: 'bell', label: 'Notificações' },
            { href: `app-integrations.html?id=${appId}`, icon: 'plug', label: 'Integrações' }
        ];

        grid.innerHTML = links.map(l => `
            <a href="${l.href}" class="quick-link-card">
                <span class="quick-link-icon">${SVG_ICONS[l.icon] || ''}</span>
                <span class="quick-link-label">${escapeHtml(l.label)}</span>
                <svg class="quick-link-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
        `).join('');
    }

    // ── Appearance Tab ─────────────────────────────────────

    function populateAppearance() {
        const primary = document.getElementById('editPrimaryColor');
        const secondary = document.getElementById('editSecondaryColor');
        const primaryVal = document.getElementById('editPrimaryColorVal');
        const secondaryVal = document.getElementById('editSecondaryColorVal');

        if (primary) { primary.value = appData.primary_color || '#7c3aed'; }
        if (secondary) { secondary.value = appData.secondary_color || '#06b6d4'; }
        if (primaryVal) primaryVal.textContent = primary?.value || '#7c3aed';
        if (secondaryVal) secondaryVal.textContent = secondary?.value || '#06b6d4';

        // Icon
        if (appData.app_icon_url) {
            showImagePreview('editIconPlaceholder', 'editIconPreview', 'editIconPreviewImg', appData.app_icon_url);
        }
        // Logo
        if (appData.app_logo_url) {
            showImagePreview('editLogoPlaceholder', 'editLogoPreview', 'editLogoPreviewImg', appData.app_logo_url);
        }
    }

    function initColorListeners() {
        bindColor('editPrimaryColor', 'editPrimaryColorVal');
        bindColor('editSecondaryColor', 'editSecondaryColorVal');
    }

    function bindColor(inputId, valueId) {
        const input = document.getElementById(inputId);
        const val = document.getElementById(valueId);
        if (input && val) {
            input.addEventListener('input', () => { val.textContent = input.value; });
        }
    }

    async function saveAppearance() {
        const btn = document.getElementById('btnSaveAppearance');
        disableBtn(btn, 'Salvando...');

        const payload = {
            primary_color: document.getElementById('editPrimaryColor')?.value || '#7c3aed',
            secondary_color: document.getElementById('editSecondaryColor')?.value || '#06b6d4'
        };

        if (iconChanged) {
            payload.app_icon_url = newIconBase64;
        }
        if (logoChanged) {
            payload.app_logo_url = newLogoBase64;
        }

        try {
            const res = await apiPut(`/api/apps/${appId}`, payload);
            if (res.success) {
                appData = { ...appData, ...payload };
                iconChanged = false;
                logoChanged = false;
                showToast('Aparência salva!', 'success');
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar Aparência');
        }
    }

    // ── Image Handling ─────────────────────────────────────

    function initImageDropZones() {
        initDropZone('editIconArea', 'editIconFile');
        initDropZone('editLogoArea', 'editLogoFile');
    }

    function initDropZone(areaId, inputId) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        if (!area || !input) return;

        area.addEventListener('click', (e) => {
            if (e.target.closest('.image-upload-remove')) return;
            input.click();
        });

        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('drag-over');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length) {
                const type = areaId === 'editIconArea' ? 'icon' : 'logo';
                processImage(e.dataTransfer.files[0], type);
            }
        });
    }

    function handleImageUpload(event, type) {
        const file = event.target.files[0];
        if (file) processImage(file, type);
    }

    async function processImage(file, type) {
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
            showToast('Formato inválido. Use PNG, JPG ou WebP.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Imagem muito grande. Máximo 2 MB.', 'error');
            return;
        }

        try {
            const base64 = await readImageAsBase64(file);
            if (type === 'icon') {
                newIconBase64 = base64;
                iconChanged = true;
                showImagePreview('editIconPlaceholder', 'editIconPreview', 'editIconPreviewImg', base64);
            } else {
                newLogoBase64 = base64;
                logoChanged = true;
                showImagePreview('editLogoPlaceholder', 'editLogoPreview', 'editLogoPreviewImg', base64);
            }
        } catch (err) {
            showToast('Erro ao processar imagem', 'error');
        }
    }

    function removeImage(type) {
        if (type === 'icon') {
            newIconBase64 = null;
            iconChanged = true;
            hideImagePreview('editIconPlaceholder', 'editIconPreview', 'editIconFile');
        } else {
            newLogoBase64 = null;
            logoChanged = true;
            hideImagePreview('editLogoPlaceholder', 'editLogoPreview', 'editLogoFile');
        }
    }

    function showImagePreview(placeholderId, previewId, imgId, src) {
        const p = document.getElementById(placeholderId);
        const pr = document.getElementById(previewId);
        const img = document.getElementById(imgId);
        if (p) p.style.display = 'none';
        if (pr) pr.style.display = 'flex';
        if (img) img.src = src;
    }

    function hideImagePreview(placeholderId, previewId, inputId) {
        const p = document.getElementById(placeholderId);
        const pr = document.getElementById(previewId);
        const inp = document.getElementById(inputId);
        if (p) p.style.display = '';
        if (pr) pr.style.display = 'none';
        if (inp) inp.value = '';
    }

    // ── Slugs Tab ──────────────────────────────────────────

    async function loadSlugs() {
        const spinner = document.getElementById('slugsSpinner');
        const list = document.getElementById('slugsList');
        if (spinner) spinner.style.display = '';
        if (list) list.innerHTML = '';

        try {
            const res = await apiGet(`/api/apps/${appId}/slugs`);
            if (res.success) {
                slugs = res.data || [];
                renderSlugs();
            }
        } catch (err) {
            // silent
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function renderSlugs() {
        const list = document.getElementById('slugsList');
        if (!list) return;

        if (slugs.length === 0) {
            list.innerHTML = '<p class="text-muted" style="padding:1rem 0;">Nenhum slug encontrado.</p>';
            return;
        }

        list.innerHTML = slugs.map(s => {
            const isPrimary = s.is_primary;
            return `
                <div class="slug-item ${isPrimary ? 'slug-item-primary' : ''}">
                    <div class="slug-item-info">
                        <span class="slug-item-url">owlapp.com/app/<strong>${escapeHtml(s.slug)}</strong></span>
                        ${isPrimary ? '<span class="badge badge-primary">Primário</span>' : ''}
                    </div>
                    <div class="slug-item-actions">
                        <button class="btn btn-ghost btn-icon btn-sm" title="Copiar" onclick="AppEditorPage.copySlugLink('${escapeHtml(s.slug)}')">
                            ${SVG_ICONS.copy || ''}
                        </button>
                        ${!isPrimary ? `
                        <button class="btn btn-ghost btn-icon btn-sm" title="Tornar primário" onclick="AppEditorPage.setPrimarySlug('${escapeHtml(s.id)}')">
                            ${SVG_ICONS.star || ''}
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Remover" onclick="AppEditorPage.deleteSlug('${escapeHtml(s.id)}')">
                            ${SVG_ICONS.trash || ''}
                        </button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function openAddSlugModal() {
        const input = document.getElementById('newSlugInput');
        if (input) input.value = '';
        openModal('modalAddSlug');
        if (input) input.focus();
    }

    async function saveNewSlug() {
        const input = document.getElementById('newSlugInput');
        const btn = document.getElementById('btnSaveSlug');
        if (!input) return;

        const slug = input.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        if (!slug || slug.length < 3) {
            showToast('Slug deve ter pelo menos 3 caracteres', 'warning');
            return;
        }

        disableBtn(btn, 'Adicionando...');

        try {
            const res = await apiPost(`/api/apps/${appId}/slugs`, { slug });
            if (res.success) {
                showToast('Slug adicionado!', 'success');
                closeModal('modalAddSlug');
                await loadSlugs();
            } else {
                showToast(res.error || 'Erro ao adicionar slug', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Adicionar');
        }
    }

    async function setPrimarySlug(slugId) {
        try {
            const res = await apiPut(`/api/apps/${appId}/slugs/${slugId}`, { is_primary: true });
            if (res.success) {
                showToast('Slug primário atualizado!', 'success');
                await loadSlugs();
            } else {
                showToast(res.error || 'Erro', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    }

    async function deleteSlug(slugId) {
        try {
            const res = await apiDelete(`/api/apps/${appId}/slugs/${slugId}`);
            if (res.success) {
                showToast('Slug removido!', 'success');
                await loadSlugs();
            } else {
                showToast(res.error || 'Erro', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    }

    function copySlugLink(slug) {
        copyToClipboard(`${window.location.origin}/app/${slug}`);
        showToast('Link copiado!', 'success');
    }

    // ── Domains Tab ────────────────────────────────────────

    async function loadDomains() {
        const spinner = document.getElementById('domainsSpinner');
        const list = document.getElementById('domainsList');
        const empty = document.getElementById('domainsEmpty');
        if (spinner) spinner.style.display = '';
        if (list) list.innerHTML = '';
        if (empty) empty.style.display = 'none';

        try {
            const res = await apiGet(`/api/apps/${appId}/domains`);
            if (res.success) {
                domains = res.data || [];
                renderDomains();
            }
        } catch (err) {
            // silent
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function renderDomains() {
        const list = document.getElementById('domainsList');
        const empty = document.getElementById('domainsEmpty');
        if (!list) return;

        if (domains.length === 0) {
            list.innerHTML = '';
            if (empty) empty.style.display = '';
            return;
        }

        if (empty) empty.style.display = 'none';

        list.innerHTML = domains.map(d => {
            const statusClass = d.verified ? 'badge-success' : 'badge-warning';
            const statusText = d.verified ? 'Verificado' : 'Pendente';
            return `
                <div class="domain-item">
                    <div class="domain-item-info">
                        <span class="domain-item-name">${escapeHtml(d.domain)}</span>
                        <span class="badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="domain-item-actions">
                        ${!d.verified ? `
                        <button class="btn btn-ghost btn-sm" onclick="AppEditorPage.verifyDomain('${escapeHtml(d.id)}')">Verificar</button>` : ''}
                        <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Remover" onclick="AppEditorPage.deleteDomain('${escapeHtml(d.id)}')">
                            ${SVG_ICONS.trash || ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openAddDomainModal() {
        const input = document.getElementById('newDomainInput');
        if (input) input.value = '';
        openModal('modalAddDomain');
        if (input) input.focus();
    }

    async function saveNewDomain() {
        const input = document.getElementById('newDomainInput');
        const btn = document.getElementById('btnSaveDomain');
        if (!input) return;

        const domain = input.value.trim().toLowerCase();

        if (!domain || !domain.includes('.')) {
            showToast('Informe um domínio válido', 'warning');
            return;
        }

        disableBtn(btn, 'Adicionando...');

        try {
            const res = await apiPost(`/api/apps/${appId}/domains`, { domain });
            if (res.success) {
                showToast('Domínio adicionado!', 'success');
                closeModal('modalAddDomain');
                await loadDomains();
            } else {
                showToast(res.error || 'Erro ao adicionar domínio', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Adicionar');
        }
    }

    async function verifyDomain(domainId) {
        try {
            const res = await apiPost(`/api/apps/${appId}/domains/${domainId}/verify`);
            if (res.success) {
                showToast('Domínio verificado!', 'success');
                await loadDomains();
            } else {
                showToast(res.error || 'Verificação falhou. Confira o CNAME.', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    }

    async function deleteDomain(domainId) {
        try {
            const res = await apiDelete(`/api/apps/${appId}/domains/${domainId}`);
            if (res.success) {
                showToast('Domínio removido!', 'success');
                await loadDomains();
            } else {
                showToast(res.error || 'Erro', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    }

    // ── Advanced Tab ───────────────────────────────────────

    async function saveAdvanced() {
        const btn = document.getElementById('btnSaveAdvanced');
        disableBtn(btn, 'Salvando...');

        const payload = {
            login_email_enabled: document.getElementById('editLoginEmail')?.checked ?? true,
            require_approval: document.getElementById('editRequireApproval')?.checked ?? false,
            enable_community: document.getElementById('editEnableCommunity')?.checked ?? true,
            enable_feed: document.getElementById('editEnableFeed')?.checked ?? true
        };

        try {
            const res = await apiPut(`/api/apps/${appId}/settings`, payload);
            if (res.success) {
                showToast('Configurações salvas!', 'success');
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar Configurações');
        }
    }

    // ── Delete App ─────────────────────────────────────────

    function initDeleteConfirm() {
        const input = document.getElementById('deleteConfirmInput');
        const btn = document.getElementById('btnConfirmDeleteApp');
        if (input && btn) {
            input.addEventListener('input', () => {
                const match = input.value.trim() === (appData?.app_name || '');
                btn.disabled = !match;
            });
        }
    }

    function openDeleteModal() {
        const nameEl = document.getElementById('deleteConfirmName');
        const input = document.getElementById('deleteConfirmInput');
        const btn = document.getElementById('btnConfirmDeleteApp');
        if (nameEl) nameEl.textContent = appData?.app_name || '';
        if (input) input.value = '';
        if (btn) btn.disabled = true;
        openModal('modalDeleteApp');
        if (input) input.focus();
    }

    async function confirmDeleteApp() {
        const btn = document.getElementById('btnConfirmDeleteApp');
        disableBtn(btn, 'Excluindo...');

        try {
            const res = await apiDelete(`/api/apps/${appId}`);
            if (res.success) {
                showToast('App excluído!', 'success');
                setTimeout(() => window.location.href = 'apps.html', 800);
            } else {
                showToast(res.error || 'Erro ao excluir', 'error');
                enableBtn(btn, 'Excluir Permanentemente');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
            enableBtn(btn, 'Excluir Permanentemente');
        }
    }

    // ── Tab Switching ──────────────────────────────────────

    function switchTab(tab) {
        currentTab = tab;
        showTab(tab);
    }

    function showTab(tab) {
        const TAB_MAP = {
            general: 'tabGeneral',
            appearance: 'tabAppearance',
            slugs: 'tabSlugs',
            domains: 'tabDomains',
            advanced: 'tabAdvanced'
        };

        // Hide all panels
        document.querySelectorAll('.editor-tab-panel').forEach(p => p.style.display = 'none');

        // Show target
        const targetId = TAB_MAP[tab];
        const target = document.getElementById(targetId);
        if (target) target.style.display = '';

        // Update nav
        document.querySelectorAll('.editor-nav-item').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
    }

    // ── Helpers ────────────────────────────────────────────

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.value = value;
        }
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        switchTab,
        saveGeneral,
        saveAppearance,
        saveAdvanced,
        handleImageUpload,
        removeImage,
        openAddSlugModal,
        saveNewSlug,
        setPrimarySlug,
        deleteSlug,
        copySlugLink,
        openAddDomainModal,
        saveNewDomain,
        verifyDomain,
        deleteDomain,
        openDeleteModal,
        confirmDeleteApp
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', AppEditorPage.init);
