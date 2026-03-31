/* ============================================================
   js/cadastro.js – OwlApp Registration Page
   ============================================================ */

const CadastroPage = (() => {

    // ── State ──────────────────────────────────────────────
    let selectedPlan = null;
    let selectedBilling = null;

    // ── Plan Names ─────────────────────────────────────────

    const PLAN_NAMES = {
        basic: 'Basic (Grátis)',
        starter: 'Starter',
        professional: 'Professional',
        business: 'Business'
    };

    // ── Init ───────────────────────────────────────────────

    function init() {
        initTheme();
        checkAlreadyLoggedIn();
        loadSelectedPlan();
        initFormSubmit();
        initPasswordStrength();
        focusFirstField();
    }

    // ── Redirect if already logged in ──────────────────────

    function checkAlreadyLoggedIn() {
        const session = getSession();
        if (session && session.access_token) {
            window.location.href = 'dashboard.html';
        }
    }

    // ── Selected Plan from URL ─────────────────────────────

    function loadSelectedPlan() {
        selectedPlan = getUrlParam('plan');
        selectedBilling = getUrlParam('billing') || 'monthly';

        if (selectedPlan && PLAN_NAMES[selectedPlan]) {
            const badge = document.getElementById('selectedPlanBadge');
            const text = document.getElementById('selectedPlanText');
            if (badge && text) {
                const billingLabel = selectedBilling === 'yearly' ? 'Anual' : 'Mensal';
                text.textContent = `Plano selecionado: ${PLAN_NAMES[selectedPlan]} (${billingLabel})`;
                badge.style.display = 'block';
            }
        }
    }

    // ── Form Submit via Enter ──────────────────────────────

    function initFormSubmit() {
        const form = document.getElementById('cadastroForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleCadastro();
            });
        }
    }

    // ── Focus ──────────────────────────────────────────────

    function focusFirstField() {
        const el = document.getElementById('cadastroName');
        if (el) el.focus();
    }

    // ── Password Strength ──────────────────────────────────

    function initPasswordStrength() {
        const input = document.getElementById('cadastroPassword');
        if (!input) return;

        input.addEventListener('input', () => {
            updatePasswordStrength(input.value);
        });
    }

    function updatePasswordStrength(password) {
        const bar = document.getElementById('passwordStrengthBar');
        const text = document.getElementById('passwordStrengthText');
        if (!bar || !text) return;

        const strength = calculateStrength(password);

        bar.style.width = strength.percent + '%';
        bar.className = 'auth-password-bar-fill ' + strength.className;
        text.textContent = strength.label;
        text.className = 'auth-password-text ' + strength.className;
    }

    function calculateStrength(password) {
        if (!password) return { percent: 0, className: '', label: '' };

        let score = 0;

        // Length
        if (password.length >= 6) score += 1;
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;

        // Character types
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^a-zA-Z0-9]/.test(password)) score += 1;

        if (score <= 2) return { percent: 25, className: 'strength-weak', label: 'Fraca' };
        if (score <= 4) return { percent: 50, className: 'strength-fair', label: 'Razoável' };
        if (score <= 5) return { percent: 75, className: 'strength-good', label: 'Boa' };
        return { percent: 100, className: 'strength-strong', label: 'Forte' };
    }

    // ── Register ───────────────────────────────────────────

    async function handleCadastro() {
        const nameEl = document.getElementById('cadastroName');
        const emailEl = document.getElementById('cadastroEmail');
        const passwordEl = document.getElementById('cadastroPassword');
        const confirmEl = document.getElementById('cadastroPasswordConfirm');
        const termsEl = document.getElementById('cadastroTerms');
        const btn = document.getElementById('btnCadastro');

        if (!nameEl || !emailEl || !passwordEl || !confirmEl || !termsEl || !btn) return;

        const name = nameEl.value.trim();
        const email = emailEl.value.trim();
        const password = passwordEl.value;
        const confirm = confirmEl.value;

        // ── Validate ───────────────────────────────────────

        clearFieldErrors();

        if (!name || name.length < 3) {
            showFieldError(nameEl, 'Nome deve ter pelo menos 3 caracteres');
            return;
        }

        if (!email) {
            showFieldError(emailEl, 'Informe seu email');
            return;
        }
        if (!isValidEmail(email)) {
            showFieldError(emailEl, 'Email inválido');
            return;
        }

        if (!password || password.length < 6) {
            showFieldError(passwordEl, 'Senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirm) {
            showFieldError(confirmEl, 'As senhas não coincidem');
            return;
        }

        if (!termsEl.checked) {
            showToast('Você precisa aceitar os Termos de Uso', 'warning');
            return;
        }

        // ── Submit ─────────────────────────────────────────

        disableBtn(btn, 'Criando conta...');

        try {
            const payload = {
                email,
                password,
                name
            };

            const res = await apiPost('/api/auth/register', payload);

            if (res.success) {
                const data = res.data;

                if (data.email_confirmation_required) {
                    // Show confirmation screen
                    showEmailConfirmation(email);
                } else {
                    // Auto-login
                    saveSession({
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        user: data.user,
                        profile: data.profile || null,
                        roles: data.roles || [],
                        logged_at: new Date().toISOString()
                    });

                    showToast('Conta criada com sucesso!', 'success');

                    // Redirect — if plan selected, go to subscription page
                    let redirectTo = 'dashboard.html';
                    if (selectedPlan && selectedPlan !== 'basic') {
                        redirectTo = `assinatura.html?plan=${selectedPlan}&billing=${selectedBilling}`;
                    }

                    setTimeout(() => {
                        window.location.href = redirectTo;
                    }, 500);
                }
            } else {
                const errMsg = res.error || res.message || 'Erro ao criar conta';
                showToast(errMsg, 'error');
                enableBtn(btn, 'Criar Conta');
            }
        } catch (err) {
            showToast('Erro de conexão. Tente novamente.', 'error');
            enableBtn(btn, 'Criar Conta');
        }
    }

    // ── Email Confirmation Screen ──────────────────────────

    function showEmailConfirmation(email) {
        const form = document.getElementById('cadastroForm');
        const confirmation = document.getElementById('emailConfirmation');
        const footer = document.getElementById('authFooter');
        const planBadge = document.getElementById('selectedPlanBadge');
        const title = document.querySelector('.auth-title');
        const subtitle = document.querySelector('.auth-subtitle');
        const confirmEmail = document.getElementById('confirmEmail');

        if (form) form.style.display = 'none';
        if (confirmation) confirmation.style.display = 'block';
        if (footer) footer.style.display = 'none';
        if (planBadge) planBadge.style.display = 'none';
        if (title) title.style.display = 'none';
        if (subtitle) subtitle.style.display = 'none';
        if (confirmEmail) confirmEmail.textContent = email;
    }

    // ── Password Visibility Toggle ─────────────────────────

    function togglePasswordVisibility(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (!input || !btn) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        btn.innerHTML = isPassword
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }

    // ── Validation Helpers ─────────────────────────────────

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

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
        document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
        document.querySelectorAll('.form-error').forEach(el => el.remove());
    }

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        handleCadastro,
        togglePasswordVisibility
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', CadastroPage.init);
