/* ============================================================
   js/app-contents.js – OwlApp Contents Management
   ============================================================ */

const ContentsPage = (() => {

    // ── State ──────────────────────────────────────────────
    let appId = null;
    let moduleId = null;
    let moduleName = '';
    let contents = [];
    let editingId = null;
    let deleteId = null;
    let deleteName = '';

    // Images
    let contentImageBase64 = null;
    let thumbBase64 = null;

    // Drag
    let dragSrcIndex = null;

    // ── Type → Fields map ──────────────────────────────────
    const TYPE_FIELDS_MAP = {
        video:  'fieldsVideo',
        text:   'fieldsText',
        image:  'fieldsImage',
        audio:  'fieldsAudio',
        pdf:    'fieldsPdf',
        embed:  'fieldsEmbed',
        quiz:   'fieldsQuiz',
        paint:  'fieldsPaint'
    };

    // ── Type display info ──────────────────────────────────
    const TYPE_INFO = {
        video:  { label: 'Vídeo',      icon: 'video',     color: 'var(--color-danger)' },
        text:   { label: 'Texto',      icon: 'fileText',  color: 'var(--color-info)' },
        image:  { label: 'Imagem',     icon: 'image',     color: 'var(--color-success)' },
        audio:  { label: 'Áudio',      icon: 'music',     color: 'var(--color-warning)' },
        pdf:    { label: 'Arquivo',    icon: 'fileText',  color: 'var(--color-primary)' },
        embed:  { label: 'Embed',      icon: 'code',      color: '#9333ea' },
        quiz:   { label: 'Quiz',       icon: 'fileText',  color: '#ec4899' },
        paint:  { label: 'Pintura',    icon: 'palette',   color: '#f97316' }
    };

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Conteúdos');
        initSidebar();

        appId = getUrlParam('app_id');
        moduleId = getUrlParam('module_id');

        if (!appId || !moduleId) {
            showToast('Parâmetros inválidos', 'error');
            setTimeout(() => window.location.href = 'apps.html', 1000);
            return;
        }

        initDropZones();
        updateBreadcrumb();
        loadModule();
        loadContents();
    }

    // ── Breadcrumb ─────────────────────────────────────────

    function updateBreadcrumb() {
        const appLink = document.getElementById('breadcrumbAppLink');
        const modulesLink = document.getElementById('breadcrumbModulesLink');
        if (appLink) appLink.href = `app-editor.html?id=${appId}`;
        if (modulesLink) modulesLink.href = `app-modules.html?id=${appId}`;
    }

    // ── Load Module Info ───────────────────────────────────

    async function loadModule() {
        try {
            const res = await apiGet(`/api/apps/${appId}/modules/${moduleId}`);
            if (res.success && res.data) {
                moduleName = res.data.title || res.data.name || 'Módulo';
                const nameEl = document.getElementById('breadcrumbModuleName');
                const titleEl = document.getElementById('pageTitle');
                if (nameEl) nameEl.textContent = moduleName;
                if (titleEl) titleEl.textContent = `Conteúdos – ${moduleName}`;
            }
        } catch (err) {
            // Non-critical
        }
    }

    // ── Load Contents ──────────────────────────────────────

    async function loadContents() {
        const spinner = document.getElementById('contentsSpinner');
        const empty = document.getElementById('contentsEmpty');
        const list = document.getElementById('contentsList');
        const hint = document.getElementById('reorderHint');

        showEl(spinner);
        hideEl(empty);
        hideEl(list);
        hideEl(hint);

        try {
            const res = await apiGet(`/api/apps/${appId}/modules/${moduleId}/contents`);

            hideEl(spinner);

            if (res.success) {
                contents = res.data || [];
                updateCountText();

                if (contents.length === 0) {
                    showEl(empty);
                } else {
                    renderContents();
                    showEl(list);
                    if (contents.length > 1) showEl(hint);
                }
            } else {
                showEl(empty);
                showToast(res.error || 'Erro ao carregar conteúdos', 'error');
            }
        } catch (err) {
            hideEl(spinner);
            showEl(empty);
            showToast('Erro de conexão', 'error');
        }
    }

    function updateCountText() {
        const el = document.getElementById('contentsCountText');
        if (el) {
            el.textContent = `${contents.length} conteúdo${contents.length !== 1 ? 's' : ''}`;
        }
    }

    // ── Render Contents ────────────────────────────────────

    function renderContents() {
        const list = document.getElementById('contentsList');
        if (!list) return;

        list.innerHTML = contents.map((c, index) => {
            const id = escapeHtml(c.id);
            const title = escapeHtml(c.title || 'Sem título');
            const type = c.content_type || 'text';
            const info = TYPE_INFO[type] || TYPE_INFO.text;
            const statusClass = c.status === 'published' ? 'badge-success' : 'badge-warning';
            const statusText = c.status === 'published' ? 'Publicado' : 'Rascunho';
            const isFree = c.is_free;

            const thumbHtml = c.thumbnail_url
                ? `<img src="${escapeHtml(c.thumbnail_url)}" alt="${title}" class="content-item-thumb">`
                : `<div class="content-item-thumb-placeholder" style="color:${info.color}">
                       ${SVG_ICONS[info.icon] || ''}
                   </div>`;

            return `
                <div class="content-item" data-content-id="${id}" data-index="${index}" draggable="true"
                     ondragstart="ContentsPage.onDragStart(event, ${index})"
                     ondragover="ContentsPage.onDragOver(event)"
                     ondragenter="ContentsPage.onDragEnter(event)"
                     ondragleave="ContentsPage.onDragLeave(event)"
                     ondrop="ContentsPage.onDrop(event, ${index})"
                     ondragend="ContentsPage.onDragEnd(event)">

                    <div class="content-item-drag" title="Arrastar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>

                    <div class="content-item-thumb-wrap">
                        ${thumbHtml}
                    </div>

                    <div class="content-item-info">
                        <div class="content-item-top">
                            <span class="content-item-order">#${index + 1}</span>
                            <h3 class="content-item-name">${title}</h3>
                        </div>
                        ${c.description ? `<p class="content-item-desc">${escapeHtml(truncate(c.description, 100))}</p>` : ''}
                        <div class="content-item-meta">
                            <span class="content-type-badge" style="color:${info.color}">
                                ${SVG_ICONS[info.icon] || ''}
                                ${info.label}
                            </span>
                            <span class="badge ${statusClass}">${statusText}</span>
                            ${isFree ? '<span class="badge badge-info">Gratuito</span>' : ''}
                            ${c.duration_minutes ? `<span class="content-item-meta-text">${c.duration_minutes} min</span>` : ''}
                        </div>
                    </div>

                    <div class="content-item-actions">
                        <button class="btn btn-ghost btn-icon btn-sm" title="Editar" onclick="ContentsPage.openEditModal('${id}')">
                            ${SVG_ICONS.edit || ''}
                        </button>
                        <button class="btn btn-ghost btn-icon btn-sm btn-icon-danger" title="Excluir" onclick="ContentsPage.openDeleteModal('${id}', '${title}')">
                            ${SVG_ICONS.trash || ''}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ── Type Change ────────────────────────────────────────

    function onTypeChange() {
        const type = document.getElementById('contentType')?.value || 'video';
        Object.entries(TYPE_FIELDS_MAP).forEach(([key, panelId]) => {
            const panel = document.getElementById(panelId);
            if (panel) panel.style.display = key === type ? '' : 'none';
        });
    }

    // ── Add / Edit Modal ───────────────────────────────────

    function openAddModal() {
        editingId = null;
        contentImageBase64 = null;
        thumbBase64 = null;
        resetModalForm();
        const title = document.getElementById('modalContentTitle');
        if (title) title.textContent = 'Novo Conteúdo';
        onTypeChange();
        openModal('modalContent');
        const titleInput = document.getElementById('contentTitle');
        if (titleInput) titleInput.focus();
    }

    function openEditModal(contentId) {
        const c = contents.find(x => x.id === contentId);
        if (!c) return;

        editingId = contentId;
        contentImageBase64 = null;
        thumbBase64 = null;

        const title = document.getElementById('modalContentTitle');
        if (title) title.textContent = 'Editar Conteúdo';

        setVal('contentTitle', c.title || '');
        setVal('contentType', c.content_type || 'video');
        setVal('contentStatus', c.status || 'draft');
        setVal('contentDescription', c.description || '');

        const isFreeEl = document.getElementById('contentIsFree');
        if (isFreeEl) isFreeEl.checked = !!c.is_free;

        // Populate type-specific fields
        setVal('contentVideoUrl', c.video_url || '');
        setVal('contentVideoDuration', c.duration_minutes || '');
        setVal('contentTextBody', c.text_body || c.body_html || '');
        setVal('contentImageUrl', c.image_url || '');
        setVal('contentAudioUrl', c.audio_url || '');
        setVal('contentAudioDuration', c.duration_minutes || '');
        setVal('contentFileUrl', c.file_url || '');
        setVal('contentFileName', c.file_name || '');
        setVal('contentEmbedUrl', c.embed_url || '');
        setVal('contentEmbedCode', c.embed_code || '');
        setVal('contentQuizUrl', c.quiz_url || '');
        setVal('contentPaintBgUrl', c.paint_bg_url || '');

        // Thumbnail
        if (c.thumbnail_url) {
            showImgPreview('contentThumbPlaceholder', 'contentThumbPreview', 'contentThumbPreviewImg', c.thumbnail_url);
        } else {
            resetPreview('contentThumbPlaceholder', 'contentThumbPreview', 'contentThumbFile');
        }

        // Content image
        if (c.image_url) {
            showImgPreview('contentImagePlaceholder', 'contentImagePreview', 'contentImagePreviewImg', c.image_url);
        } else {
            resetPreview('contentImagePlaceholder', 'contentImagePreview', 'contentImageFile');
        }

        onTypeChange();
        openModal('modalContent');
    }

    function resetModalForm() {
        const fields = [
            'contentTitle', 'contentDescription',
            'contentVideoUrl', 'contentVideoDuration',
            'contentTextBody',
            'contentImageUrl',
            'contentAudioUrl', 'contentAudioDuration',
            'contentFileUrl', 'contentFileName',
            'contentEmbedUrl', 'contentEmbedCode',
            'contentQuizUrl',
            'contentPaintBgUrl'
        ];
        fields.forEach(id => setVal(id, ''));

        setVal('contentType', 'video');
        setVal('contentStatus', 'draft');

        const isFree = document.getElementById('contentIsFree');
        if (isFree) isFree.checked = false;

        resetPreview('contentThumbPlaceholder', 'contentThumbPreview', 'contentThumbFile');
        resetPreview('contentImagePlaceholder', 'contentImagePreview', 'contentImageFile');
    }

    // ── Save Content ───────────────────────────────────────

    async function saveContent() {
        const titleVal = document.getElementById('contentTitle')?.value.trim();
        if (!titleVal || titleVal.length < 2) {
            showToast('Título deve ter pelo menos 2 caracteres', 'warning');
            return;
        }

        const type = document.getElementById('contentType')?.value || 'video';

        // Validate required by type
        if (type === 'video' && !document.getElementById('contentVideoUrl')?.value.trim()) {
            showToast('Informe a URL do vídeo', 'warning');
            return;
        }
        if (type === 'audio' && !document.getElementById('contentAudioUrl')?.value.trim()) {
            showToast('Informe a URL do áudio', 'warning');
            return;
        }
        if (type === 'pdf' && !document.getElementById('contentFileUrl')?.value.trim()) {
            showToast('Informe a URL do arquivo', 'warning');
            return;
        }

        const btn = document.getElementById('btnSaveContent');
        disableBtn(btn, 'Salvando...');

        const payload = {
            title: titleVal,
            content_type: type,
            status: document.getElementById('contentStatus')?.value || 'draft',
            description: document.getElementById('contentDescription')?.value.trim() || null,
            is_free: document.getElementById('contentIsFree')?.checked || false,

            // Type-specific
            video_url: type === 'video' ? (document.getElementById('contentVideoUrl')?.value.trim() || null) : null,
            duration_minutes: null,
            text_body: type === 'text' ? (document.getElementById('contentTextBody')?.value || null) : null,
            image_url: null,
            audio_url: type === 'audio' ? (document.getElementById('contentAudioUrl')?.value.trim() || null) : null,
            file_url: type === 'pdf' ? (document.getElementById('contentFileUrl')?.value.trim() || null) : null,
            file_name: type === 'pdf' ? (document.getElementById('contentFileName')?.value.trim() || null) : null,
            embed_url: type === 'embed' ? (document.getElementById('contentEmbedUrl')?.value.trim() || null) : null,
            embed_code: type === 'embed' ? (document.getElementById('contentEmbedCode')?.value.trim() || null) : null,
            quiz_url: type === 'quiz' ? (document.getElementById('contentQuizUrl')?.value.trim() || null) : null,
            paint_bg_url: type === 'paint' ? (document.getElementById('contentPaintBgUrl')?.value.trim() || null) : null
        };

        // Duration
        if (type === 'video') {
            const dur = parseInt(document.getElementById('contentVideoDuration')?.value);
            if (!isNaN(dur) && dur > 0) payload.duration_minutes = dur;
        } else if (type === 'audio') {
            const dur = parseInt(document.getElementById('contentAudioDuration')?.value);
            if (!isNaN(dur) && dur > 0) payload.duration_minutes = dur;
        }

        // Image (type image or upload)
        if (type === 'image') {
            payload.image_url = contentImageBase64 || document.getElementById('contentImageUrl')?.value.trim() || null;
        }

        // Thumbnail
        if (thumbBase64 !== null) {
            payload.thumbnail_url = thumbBase64 || null;
        }

        try {
            let res;
            if (editingId) {
                res = await apiPut(`/api/apps/${appId}/modules/${moduleId}/contents/${editingId}`, payload);
            } else {
                res = await apiPost(`/api/apps/${appId}/modules/${moduleId}/contents`, payload);
            }

            if (res.success) {
                showToast(editingId ? 'Conteúdo atualizado!' : 'Conteúdo criado!', 'success');
                closeModal('modalContent');
                await loadContents();
            } else {
                showToast(res.error || 'Erro ao salvar', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        } finally {
            enableBtn(btn, 'Salvar');
        }
    }

    // ── Delete Content ─────────────────────────────────────

    function openDeleteModal(contentId, contentName) {
        deleteId = contentId;
        deleteName = contentName;
        const nameEl = document.getElementById('deleteContentName');
        if (nameEl) nameEl.textContent = contentName;
        openModal('modalDeleteContent');
    }

    async function confirmDelete() {
        if (!deleteId) return;
        const btn = document.getElementById('btnConfirmDeleteContent');
        disableBtn(btn, 'Excluindo...');

        try {
            const res = await apiDelete(`/api/apps/${appId}/modules/${moduleId}/contents/${deleteId}`);
            if (res.success) {
                showToast('Conteúdo excluído!', 'success');
                closeModal('modalDeleteContent');
                contents = contents.filter(c => c.id !== deleteId);
                deleteId = null;
                updateCountText();

                if (contents.length === 0) {
                    hideEl(document.getElementById('contentsList'));
                    hideEl(document.getElementById('reorderHint'));
                    showEl(document.getElementById('contentsEmpty'));
                } else {
                    renderContents();
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

    // ── Drag and Drop Reorder ──────────────────────────────

    function onDragStart(event, index) {
        dragSrcIndex = index;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', index);
        const item = event.target.closest('.content-item');
        if (item) item.classList.add('dragging');
    }

    function onDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }

    function onDragEnter(event) {
        event.preventDefault();
        const item = event.target.closest('.content-item');
        if (item && !item.classList.contains('dragging')) {
            item.classList.add('drag-over-item');
        }
    }

    function onDragLeave(event) {
        const item = event.target.closest('.content-item');
        if (item) item.classList.remove('drag-over-item');
    }

    function onDrop(event, dropIndex) {
        event.preventDefault();
        const item = event.target.closest('.content-item');
        if (item) item.classList.remove('drag-over-item');
        if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;

        const moved = contents.splice(dragSrcIndex, 1)[0];
        contents.splice(dropIndex, 0, moved);

        renderContents();
        saveOrder();
    }

    function onDragEnd(event) {
        dragSrcIndex = null;
        document.querySelectorAll('.content-item').forEach(el => {
            el.classList.remove('dragging', 'drag-over-item');
        });
    }

    async function saveOrder() {
        const ordered_ids = contents.map(c => c.id);
        try {
            const res = await apiPut(`/api/apps/${appId}/modules/${moduleId}/contents/reorder`, { ordered_ids });
            if (res.success) {
                showToast('Ordem salva!', 'success');
            } else {
                showToast(res.error || 'Erro ao salvar ordem', 'error');
            }
        } catch (err) {
            showToast('Erro ao salvar ordem', 'error');
        }
    }

    // ── Image Uploads ──────────────────────────────────────

    function initDropZones() {
        initSingleDropZone('contentImageArea', 'contentImageFile', 'image');
        initSingleDropZone('contentThumbArea', 'contentThumbFile', 'thumb');
    }

    function initSingleDropZone(areaId, inputId, type) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        if (!area || !input) return;

        area.addEventListener('click', (e) => {
            if (e.target.closest('.image-upload-remove')) return;
            input.click();
        });
        area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
        area.addEventListener('dragleave', () => { area.classList.remove('drag-over'); });
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length) processFile(e.dataTransfer.files[0], type);
        });
    }

    function handleContentImageUpload(event) {
        const f = event.target.files[0];
        if (f) processFile(f, 'image');
    }

    function handleThumbUpload(event) {
        const f = event.target.files[0];
        if (f) processFile(f, 'thumb');
    }

    async function processFile(file, type) {
        if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
            showToast('Formato inválido.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Máximo 2 MB.', 'error');
            return;
        }

        try {
            const base64 = await readImageAsBase64(file);
            if (type === 'image') {
                contentImageBase64 = base64;
                showImgPreview('contentImagePlaceholder', 'contentImagePreview', 'contentImagePreviewImg', base64);
            } else {
                thumbBase64 = base64;
                showImgPreview('contentThumbPlaceholder', 'contentThumbPreview', 'contentThumbPreviewImg', base64);
            }
        } catch (err) {
            showToast('Erro ao processar imagem', 'error');
        }
    }

    function removeContentImage() {
        contentImageBase64 = null;
        resetPreview('contentImagePlaceholder', 'contentImagePreview', 'contentImageFile');
    }

    function removeThumb() {
        thumbBase64 = '';
        resetPreview('contentThumbPlaceholder', 'contentThumbPreview', 'contentThumbFile');
    }

    // ── Image Helpers ──────────────────────────────────────

    function showImgPreview(placeholderId, previewId, imgId, src) {
        const p = document.getElementById(placeholderId);
        const pr = document.getElementById(previewId);
        const img = document.getElementById(imgId);
        if (p) p.style.display = 'none';
        if (pr) pr.style.display = 'flex';
        if (img) img.src = src;
    }

    function resetPreview(placeholderId, previewId, inputId) {
        const p = document.getElementById(placeholderId);
        const pr = document.getElementById(previewId);
        const inp = document.getElementById(inputId);
        if (p) p.style.display = '';
        if (pr) pr.style.display = 'none';
        if (inp) inp.value = '';
    }

    // ── Helpers ────────────────────────────────────────────

    function showEl(el) { if (el) el.style.display = ''; }
    function hideEl(el) { if (el) el.style.display = 'none'; }
    function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        openAddModal,
        openEditModal,
        saveContent,
        openDeleteModal,
        confirmDelete,
        onTypeChange,
        handleContentImageUpload,
        handleThumbUpload,
        removeContentImage,
        removeThumb,
        onDragStart,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onDragEnd
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', ContentsPage.init);
