/* ============================================================
   js/create-app.js – OwlApp Create App Wizard
   ============================================================ */

const CreateAppPage = (() => {

    // ── State ──────────────────────────────────────────────
    let currentStep = 1;
    const totalSteps = 3;

    let iconBase64 = null;
    let logoBase64 = null;
    let slugValid = false;
    let slugChecking = false;

    // ── Category Labels ────────────────────────────────────
    const CATEGORY_LABELS = {
        education: 'Educação',
        fitness: 'Fitness & Saúde',
        business: 'Negócios',
        technology: 'Tecnologia',
        marketing: 'Marketing',
        design: 'Design',
        finance: 'Finanças',
        lifestyle: 'Estilo de Vida',
        music: 'Música',
        cooking: 'Culinária',
        other: 'Outro'
    };

    // ── Init ───────────────────────────────────────────────

    function init() {
        requireAuth();
        initTheme();
        generateSidebar('apps');
        generateHeader('Criar App');
        initSidebar();
        initSlugAutoGen();
        initSlugValidation();
        initColorPickers();
        initImageUploads();
        initDescCounter();
    }

    // ── Slug Auto Generation ───────────────────────────────

    function initSlugAutoGen() {
        const nameInput = document.getElementById('appName');
        const slugInput = document.getElementById('appSlug');
        if (!nameInput || !slugInput) return;

        let userEditedSlug = false;

        slugInput.addEventListener('input', () => {
            userEditedSlug = true;
            formatSlugInput();
        });

        nameInput.addEventListener('input', () => {
            if (!userEditedSlug || !slugInput.value.trim()) {
                slugInput.value = slugify(nameInput.value);
                userEditedSlug = false;
                validateSlug();
            }
        });
    }

    function formatSlugInput() {
        const input = document.getElementById('appSlug');
        if (!input) return;
        // Allow only lowercase, numbers, hyphens
        input.value = input.value
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-/, '');

        validateSlug();
    }

    // ── Slug Validation ────────────────────────────────────

    function initSlugValidation() {
        const input = document.getElementById('appSlug');
        if (!input) return;

        input.addEventListener('input', debounce(() => {
            validateSlug();
        }, 500));
    }

    async function validateSlug() {
        const input = document.getElementById('appSlug');
        const hint = document.getElementById('slugHint');
        const error = document.getElementById('slugError');
        if (!input || !hint || !error) return;

        const slug = input.value.trim();

        // Reset
        error.style.display = 'none';
        input.classList.remove('error');
        slugValid = false;

        if (!slug) {
            hint.textContent = 'Apenas letras minúsculas, números e hifens.';
            return;
        }

        if (slug.length < 3) {
            hint.textContent = 'Mínimo 3 caracteres.';
            return;
        }

        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && slug.length >= 3) {
            hint.textContent = 'Deve começar e terminar com letra ou número.';
            return;
        }

        // Check availability
        hint.textContent = 'Verificando disponibilidade...';
        slugChecking = true;

        try {
            const res = await apiGet(`/api/apps/check-slug/${encodeURIComponent(slug)}`);

            slugChecking = false;

            if (res.success && res.data && res.data.available) {
                hint.textContent = '✓ Slug disponível!';
                hint.classList.add('text-success');
                slugValid = true;
            } else {
                hint.textContent = '';
                hint.classList.remove('text-success');
                error.textContent = 'Este slug já está em uso. Escolha outro.';
                error.style.display = 'block';
                input.classList.add('error');
                slugValid = false;
            }
        } catch (err) {
            slugChecking = false;
            hint.textContent = 'Não foi possível verificar. Tente novamente.';
            hint.classList.remove('text-success');
        }
    }

    // ── Color Pickers ──────────────────────────────────────

    function initColorPickers() {
        const primary = document.getElementById('appPrimaryColor');
        const secondary = document.getElementById('appSecondaryColor');
        const primaryVal = document.getElementById('primaryColorValue');
        const secondaryVal = document.getElementById('secondaryColorValue');

        if (primary && primaryVal) {
            primary.addEventListener('input', () => {
                primaryVal.textContent = primary.value;
            });
        }

        if (secondary && secondaryVal) {
            secondary.addEventListener('input', () => {
                secondaryVal.textContent = secondary.value;
            });
        }
    }

    // ── Description Counter ────────────────────────────────

    function initDescCounter() {
        const textarea = document.getElementById('appDescription');
        const counter = document.getElementById('descCharCount');
        if (!textarea || !counter) return;

        textarea.addEventListener('input', () => {
            counter.textContent = textarea.value.length;
        });
    }

    // ── Image Uploads ──────────────────────────────────────

    function initImageUploads() {
        initDropZone('iconUploadArea', 'iconFileInput');
        initDropZone('logoUploadArea', 'logoFileInput');
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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processImageFile(files[0], areaId === 'iconUploadArea' ? 'icon' : 'logo');
            }
        });
    }

    function handleIconUpload(event) {
        const file = event.target.files[0];
        if (file) processImageFile(file, 'icon');
    }

    function handleLogoUpload(event) {
        const file = event.target.files[0];
        if (file) processImageFile(file, 'logo');
    }

    async function processImageFile(file, type) {
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
                iconBase64 = base64;
                showImagePreview('iconPlaceholder', 'iconPreview', 'iconPreviewImg', base64);
            } else {
                logoBase64 = base64;
                showImagePreview('logoPlaceholder', 'logoPreview', 'logoPreviewImg', base64);
            }
        } catch (err) {
            showToast('Erro ao processar imagem.', 'error');
        }
    }

    function showImagePreview(placeholderId, previewId, imgId, base64) {
        const placeholder = document.getElementById(placeholderId);
        const preview = document.getElementById(previewId);
        const img = document.getElementById(imgId);

        if (placeholder) placeholder.style.display = 'none';
        if (preview) preview.style.display = 'flex';
        if (img) img.src = base64;
    }

    function removeIcon() {
        iconBase64 = null;
        const placeholder = document.getElementById('iconPlaceholder');
        const preview = document.getElementById('iconPreview');
        const input = document.getElementById('iconFileInput');
        if (placeholder) placeholder.style.display = '';
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
    }

    function removeLogo() {
        logoBase64 = null;
        const placeholder = document.getElementById('logoPlaceholder');
        const preview = document.getElementById('logoPreview');
        const input = document.getElementById('logoFileInput');
        if (placeholder) placeholder.style.display = '';
        if (preview) preview.style.display = 'none';
        if (input) input.value = '';
    }

    // ── Wizard Navigation ──────────────────────────────────

    function nextStep() {
        if (!validateCurrentStep()) return;

        if (currentStep < totalSteps) {
            setStep(currentStep + 1);
        }
    }

    function prevStep() {
        if (currentStep > 1) {
            setStep(currentStep - 1);
        }
    }

    function setStep(step) {
        currentStep = step;

        // Update step indicators
        for (let i = 1; i <= totalSteps; i++) {
            const stepEl = document.getElementById(`wizardStep${i}`);
            const panel = document.getElementById(`wizardPanel${i}`);
            const line = document.getElementById(`wizardLine${i - 1}`);

            if (stepEl) {
                stepEl.classList.remove('active', 'completed');
                if (i < currentStep) stepEl.classList.add('completed');
                if (i === currentStep) stepEl.classList.add('active');
            }
            if (panel) {
                panel.classList.toggle('active', i === currentStep);
            }
            if (line) {
                line.classList.toggle('completed', i <= currentStep);
            }
        }

        // Update buttons
        const btnPrev = document.getElementById('btnWizardPrev');
        const btnNext = document.getElementById('btnWizardNext');
        const btnCreate = document.getElementById('btnCreateApp');

        if (btnPrev) btnPrev.style.display = currentStep > 1 ? '' : 'none';
        if (btnNext) btnNext.style.display = currentStep < totalSteps ? '' : 'none';
        if (btnCreate) btnCreate.style.display = currentStep === totalSteps ? '' : 'none';

        // If review step, populate
        if (currentStep === 3) {
            populateReview();
        }

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ── Step Validation ────────────────────────────────────

    function validateCurrentStep() {
        clearFieldErrors();

        if (currentStep === 1) {
            return validateStep1();
        }
        if (currentStep === 2) {
            return validateStep2();
        }
        return true;
    }

    function validateStep1() {
        const name = document.getElementById('appName');
        const slug = document.getElementById('appSlug');

        if (!name || !slug) return false;

        const nameVal = name.value.trim();
        const slugVal = slug.value.trim();

        if (!nameVal || nameVal.length < 2) {
            showFieldError(name, 'Nome deve ter pelo menos 2 caracteres');
            return false;
        }

        if (!slugVal || slugVal.length < 3) {
            showFieldError(slug, 'Slug deve ter pelo menos 3 caracteres');
            return false;
        }

        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slugVal)) {
            showFieldError(slug, 'Slug inválido. Use apenas letras minúsculas, números e hifens.');
            return false;
        }

        if (slugChecking) {
            showToast('Aguarde a verificação do slug...', 'warning');
            return false;
        }

        if (!slugValid) {
            showFieldError(slug, 'Este slug não está disponível.');
            return false;
        }

        return true;
    }

    function validateStep2() {
        // Step 2 has no required fields — colors have defaults, images are optional
        return true;
    }

    // ── Review ─────────────────────────────────────────────

    function populateReview() {
        const name = document.getElementById('appName')?.value.trim() || '';
        const slug = document.getElementById('appSlug')?.value.trim() || '';
        const desc = document.getElementById('appDescription')?.value.trim() || '';
        const category = document.getElementById('appCategory')?.value || '';
        const visibility = document.getElementById('appVisibility')?.value || 'private';
        const primaryColor = document.getElementById('appPrimaryColor')?.value || '#7c3aed';
        const secondaryColor = document.getElementById('appSecondaryColor')?.value || '#06b6d4';

        // Preview card
        const reviewName = document.getElementById('reviewName');
        const reviewSlug = document.getElementById('reviewSlug');
        const reviewDesc = document.getElementById('reviewDesc');
        const reviewIconPlaceholder = document.getElementById('reviewIconPlaceholder');

        if (reviewName) reviewName.textContent = name || 'Meu App';
        if (reviewSlug) reviewSlug.textContent = `owlapp.com/app/${slug}`;
        if (reviewDesc) {
            reviewDesc.textContent = desc || '';
            reviewDesc.style.display = desc ? '' : 'none';
        }

        if (reviewIconPlaceholder) {
            if (iconBase64) {
                reviewIconPlaceholder.innerHTML = `<img src="${iconBase64}" alt="Ícone" style="width:64px;height:64px;border-radius:16px;object-fit:cover;">`;
            } else {
                reviewIconPlaceholder.style.background = primaryColor;
                reviewIconPlaceholder.textContent = (name || 'A').charAt(0).toUpperCase();
            }
        }

        // Details
        setReviewValue('reviewDetailName', name);
        setReviewValue('reviewDetailSlug', slug);
        setReviewValue('reviewDetailCategory', CATEGORY_LABELS[category] || 'Não definida');
        setReviewValue('reviewDetailVisibility', visibility === 'public' ? 'Público' : 'Privado');

        const primaryDot = document.getElementById('reviewPrimaryColorDot');
        const primaryText = document.getElementById('reviewPrimaryColorText');
        const secondaryDot = document.getElementById('reviewSecondaryColorDot');
        const secondaryText = document.getElementById('reviewSecondaryColorText');

        if (primaryDot) primaryDot.style.background = primaryColor;
        if (primaryText) primaryText.textContent = primaryColor;
        if (secondaryDot) secondaryDot.style.background = secondaryColor;
        if (secondaryText) secondaryText.textContent = secondaryColor;

        setReviewValue('reviewDetailIcon', iconBase64 ? 'Enviado ✓' : 'Não enviado');
        setReviewValue('reviewDetailLogo', logoBase64 ? 'Enviado ✓' : 'Não enviado');
    }

    function setReviewValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    // ── Create App ─────────────────────────────────────────

    async function handleCreate() {
        const btn = document.getElementById('btnCreateApp');
        if (!btn) return;

        disableBtn(btn, 'Criando...');

        const payload = {
            app_name: document.getElementById('appName')?.value.trim() || '',
            slug: document.getElementById('appSlug')?.value.trim() || '',
            description: document.getElementById('appDescription')?.value.trim() || null,
            category: document.getElementById('appCategory')?.value || null,
            visibility: document.getElementById('appVisibility')?.value || 'private',
            primary_color: document.getElementById('appPrimaryColor')?.value || '#7c3aed',
            secondary_color: document.getElementById('appSecondaryColor')?.value || '#06b6d4',
            app_icon_url: iconBase64 || null,
            app_logo_url: logoBase64 || null
        };

        try {
            const res = await apiPost('/api/apps', payload);

            if (res.success) {
                showToast('App criado com sucesso!', 'success');
                const appId = res.data?.id;
                setTimeout(() => {
                    if (appId) {
                        window.location.href = `app-editor.html?id=${appId}`;
                    } else {
                        window.location.href = 'apps.html';
                    }
                }, 600);
            } else {
                showToast(res.error || 'Erro ao criar app', 'error');
                enableBtn(btn, 'Criar App');
            }
        } catch (err) {
            showToast('Erro de conexão. Tente novamente.', 'error');
            enableBtn(btn, 'Criar App');
        }
    }

    // ── Field Validation Helpers ───────────────────────────

    function showFieldError(input, message) {
        clearFieldErrors();
        input.classList.add('error');
        const group = input.closest('.form-group');
        if (group) {
            const errorEl = document.createElement('span');
            errorEl.className = 'form-error';
            errorEl.textContent = message;
            group.appendChild(errorEl);
        }
        input.focus();
    }

    function clearFieldErrors() {
        document.querySelectorAll('.form-input.error, .form-select.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.form-error:not(#slugError)').forEach(el => el.remove());
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        nextStep,
        prevStep,
        handleCreate,
        handleIconUpload,
        handleLogoUpload,
        removeIcon,
        removeLogo
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', CreateAppPage.init);
