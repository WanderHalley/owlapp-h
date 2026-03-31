/* ============================================================
   js/app-modules.js – OwlApp Modules Management
   ============================================================ */

const ModulesPage = (() => {

    // ── State ──────────────────────────────────────────────
    let appId = null;
    let modules = [];
    let editingId = null;
    let deleteId = null;
    let deleteName = '';
    let coverBase64 = null;

    // Drag state
    let dragSrcIndex = null;

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Módulos');
        initSidebar();

        appId = getUrlParam('id');
        if (!appId) {
            showToast('App não encontrado', 'error');
            setTimeout(() => window.location.href = 'apps.html', 1000);
            return;
        }

        initCoverDropZone();
        updateBreadcrumb();
        loadModules();
    }

    // ── Breadcrumb ─────────────────────────────────────────

    function updateBreadcrumb() {
        const link = document.getElementById('breadcrumbAppLink');
        if (link) {
            link.href = `app-editor.html?id=${appId}`;
            link.textContent = 'Editor';
        }
    }

    // ── Load Modules ───────────────────────────────────────

    async function loadModules() {
        const spinner = document.getElementById('modulesSpinner');
        const empty = document.getElementById('modulesEmpty');
        const list = document.getElementById('modulesList');
        const hint = document.getElementById('reorderHint');

        showEl(spinner);
        hideEl(empty);
        hideEl(list);
        hideEl(hint);

        try {
            const res = await apiGet(`/api/apps/${appId}/modules`);

            hideEl(spinner);

            if (res.success) {
                modules = res.data || [];
                updateCountText();

                if (modules.length === 0) {
                    showEl(empty);
                } else {
                    renderModules();
                    showEl(list);
                    if (modules.length > 1) showEl(hint);
                }
            } else {
                showEl(empty);
                showToast(res.error || 'Erro ao carregar módulos', 'error');
            }
        } catch (err) {
            hideEl(spinner);
            showEl(empty);
            showToast('Erro de conexão', 'error');
        }
    }

    function updateCountText() {
        const el = document.getElementById('modulesCountText');
        if (el) {
            el.textContent = `${modules.length} módulo${modules.length !== 1 ? 's' : ''}`;
        }
    }

    // ── Render Modules ─────────────────────────────────────

    function renderModules() {
        const list = document.getElementById('modulesList');
        if (!list) return;

        list.innerHTML = modules.map((mod, index) => {
            const statusClass = mod.status === 'published' ? 'badge-success' : 'badge-warning';
            const statusText = mod.status === 'published' ? 'Publicado' : 'Rascunho';
            const accessText = mod.access_type === 'free' ? 'Livre' : 'Membros';
            const accessClass = mod.access_type === 'free' ? 'badge-info' : 'badge-purple';
            const id = escapeHtml(mod.id);
            const name = escapeHtml(mod.title || mod.name || 'Sem nome');
            const contentsCount = mod.contents_count || 0;

            const coverHtml = mod.cover_image_url
                ? `<img src="${escapeHtml(mod.cover_image_url)}" alt="${name}" class="module-item-cover">`
                : `<div class="module-item-cover-placeholder">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                   </div>`;

            return `
                <div class="module-item" data-module-id="${id}" data-index="${index}" draggable="true"
                     ondragstart="ModulesPage.onDragStart(event, ${index})"
                     ondragover="ModulesPage.onDragOver(event)"
                     ondragenter="ModulesPage.onDragEnter(event)"
                     ondragleave="ModulesPage.onDragLeave(event)"
                     ondrop="ModulesPage.onDrop(event, ${index})"
                     ondragend="ModulesPage.onDragEnd(event)">

                    <div class="module-item-drag" title="Arrastar para reordenar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>

                    <div class="module-item-cover-wrap">
                        ${coverHtml}
                    </div>

                    <div class="module-item-info">
                        <div class="module-item-top">
                            <span class="module-item-order">#${index + 1}</span>
                            <h3 class="module-item-name">${name}</h3>
                        </div>
                        ${mod.description ? `<p class="module-item-desc">${escapeHtml(truncate(mod.description, 120))}</p>` : ''}
                        <div class="module-item-meta">
                            <span class="badge ${statusClass}">${statusText}</span>
                            <span class="badge ${accessClass}">${accessText}</span>
                            <span class="module-item-meta-text">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                ${contentsCount} conteúdo${contentsCount !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div class="module-item-actions">
                        <a href="app-contents.html?app_id=${escapeHtml(appId)}&module_id=${id}" class="btn btn-primary btn-sm" title="Conteúdos">
                            ${SVG_ICONS.fileText || ''}
                            Conteúdos
                        </a>
                        <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="ModulesPage.openEditModal('${id}')">
                            ${SVG_ICONS.edit || ''}
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Excluir" onclick="ModulesPage.openDeleteModal('${id}', '${name}')">
                            ${SVG_ICONS.trash || ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── Drag and Drop Reorder ──────────────────────────────

    function onDragStart(event, index) {
        dragSrcIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', index);
        const item = event.target.closest('.module-item');
        if (item) {
            item.classList.add('dragging');
        }
    }

    function onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function onDragEnter(event) {
        event.preventDefault();
        const item = event.target.closest('.module-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over-item');
        }
    }

    function onDragLeave(event) {
        const item = event.target.closest('.module-item');
        if (item) {
            item.classList.remove('drag-over-item');
        }
    }

    function onDrop(event, dropIndex) {
        event.preventDefault();
        const item = event.target.closest('.module-item');
        if (item) item.classList.remove('drag-over-item');

        if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;

        // Reorder array
        const moved = modules.splice(dragSrcIndex, 1)[0];
        modules.splice(dropIndex, 0, moved);

        renderModules();
        saveOrder();
    }

    function onDragEnd(event) {
        dragSrcIndex = null;
        document.querySelectorAll('.module-item').forEach(el => {
            el.classList.remove('dragging', 'drag-over-item');
        });
    }

    async function saveOrder() {
        const ordered_ids = modules.map(m => m.id);

        try {
            const res = await apiPut(`/api/apps/${appId}/modules/reorder`, { ordered_ids });
            if (res.success) {
                showToast('Ordem salva!', 'success');
            } else {
                showToast(res.error || 'Erro ao salvar ordem', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão ao salvar ordem', 'error');
        }
    }

    // ── Add / Edit Modal ───────────────────────────────────

    function openAddModal() {
        editingId = null;
        coverBase64 = null;
        resetModalForm();
        const title = document.getElementById('modalModuleTitle');
        if (title) title.textContent = 'Novo Módulo';
        openModal('modalModule');
        const nameInput = document.getElementById('moduleName');
        if (nameInput) nameInput.focus();
    }

    function openEditModal(moduleId) {
        const mod = modules.find(m => m.id === moduleId);
        if (!mod) return;

        editingId = moduleId;
        coverBase64 = null;

        const title = document.getElementById('modalModuleTitle');
        if (title) title.textContent = 'Editar Módulo';

        setVal('moduleName', mod.title || mod.name || '');
        setVal('moduleDescription', mod.description || '');
        setVal('moduleStatus', mod.status || 'draft');
        setVal('moduleAccessType', mod.access_type || 'free');

        // Cover image
        if (mod.cover_image_url) {
            showImagePreview('moduleCoverPlaceholder', 'moduleCoverPreview', 'moduleCoverPreviewImg', mod.cover_image_url);
        } else {
            resetCoverPreview();
        }

        openModal('modalModule');
    }

    function resetModalForm() {
        setVal('moduleName', '');
        setVal('moduleDescription', '');
        setVal('moduleStatus', 'draft');
        setVal('moduleAccessType', 'free');
        resetCoverPreview();
    }

    // ── Save Module ────────────────────────────────────────

    async function saveModule() {
        const name = document.getElementById('moduleName')?.value.trim();
        if (!name || name.length < 2) {
            showToast('Nome deve ter pelo menos 2 caracteres', 'warning');
            return;
        }

        const btn = document.getElementById('btnSaveModule');
        disableBtn(btn, 'Salvando...');

        const payload = {
            title: name,
            description: document.getElementById('moduleDescription')?.value.trim() || null,
            status: document.getElementById('moduleStatus')?.value || 'draft',
            access_type: document.getElementById('moduleAccessType')?.value || 'free'
        };

        if (coverBase64 !== null) {
            payload.cover_image_url = coverBase64;
        }

        try {
            let res;
            if (editingId) {
                res = await apiPut(`/api/apps/${appId}/modules/${editingId}`, payload);
            } else {
                res = await apiPost(`/api/apps/${appId}/modules`, payload);
            }

            if (res.success) {
                showToast(editingId ? 'Módulo atualizado!' : 'Módulo criado!', 'success');
                closeModal('modalModule');
                await loadModules();
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar');
        }
    }

    // ── Delete Module ──────────────────────────────────────

    function openDeleteModal(moduleId, moduleName) {
        deleteId = moduleId;
        deleteName = moduleName;
        const nameEl = document.getElementById('deleteModuleName');
        if (nameEl) nameEl.textContent = moduleName;
        openModal('modalDeleteModule');
    }

    async function confirmDelete() {
        if (!deleteId) return;

        const btn = document.getElementById('btnConfirmDeleteModule');
        disableBtn(btn, 'Excluindo...');

        try {
            const res = await apiDelete(`/api/apps/${appId}/modules/${deleteId}`);
            if (res.success) {
                showToast('Módulo excluído!', 'success');
                closeModal('modalDeleteModule');
                modules = modules.filter(m => m.id !== deleteId);
                deleteId = null;
                updateCountText();

                if (modules.length === 0) {
                    hideEl(document.getElementById('modulesList'));
                    hideEl(document.getElementById('reorderHint'));
                    showEl(document.getElementById('modulesEmpty'));
                } else {
                    renderModules();
                }
            } else {
                showToast(res.error || 'Erro ao excluir', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Excluir');
        }
    }

    // ── Cover Image ────────────────────────────────────────

    function initCoverDropZone() {
        const area = document.getElementById('moduleCoverArea');
        const input = document.getElementById('moduleCoverFile');
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
                processCover(e.dataTransfer.files[0]);
            }
        });
    }

    function handleCoverUpload(event) {
        const file = event.target.files[0];
        if (file) processCover(file);
    }

    async function processCover(file) {
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
            showToast('Formato inválido. Use PNG, JPG ou WebP.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Imagem muito grande. Máximo 2 MB.', 'error');
            return;
        }

        try {
            coverBase64 = await readImageAsBase64(file);
            showImagePreview('moduleCoverPlaceholder', 'moduleCoverPreview', 'moduleCoverPreviewImg', coverBase64);
        } catch (err) {
            showToast('Erro ao processar imagem', 'error');
        }
    }

    function removeCoverImage() {
        coverBase64 = '';
        resetCoverPreview();
    }

    function resetCoverPreview() {
        const placeholder = document.getElementById('moduleCoverPlaceholder');
        const preview = document.getElementById('moduleCoverPreview');
        const input = document.getElementById('moduleCoverFile');
        if (placeholder) placeholder.style.display = '';
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
    }

    function showImagePreview(placeholderId, previewId, imgId, src) {
        const p = document.getElementById(placeholderId);
        const pr = document.getElementById(previewId);
        const img = document.getElementById(imgId);
        if (p) p.style.display = 'none';
        if (pr) pr.style.display = 'flex';
        if (img) img.src = src;
    }

    // ── Helpers ────────────────────────────────────────────

    function showEl(el) { if (el) el.style.display = ''; }
    function hideEl(el) { if (el) el.style.display = 'none'; }

    function setVal(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        openAddModal,
        openEditModal,
        saveModule,
        openDeleteModal,
        confirmDelete,
        handleCoverUpload,
        removeCoverImage,
        onDragStart,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onDragEnd
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', ModulesPage.init);
