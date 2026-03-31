/* ============================================================
   js/login.js – OwlApp Login Page
   ============================================================ */

const LoginPage = (() => {

    // ── Init ───────────────────────────────────────────────

    function init() {
        initTheme();
        checkAlreadyLoggedIn();
        initFormSubmit();
        focusFirstField();
    }

    // ── Redirect if already logged in ──────────────────────

    function checkAlreadyLoggedIn() {
        const session = getSession();
        if (session && session.access_token) {
            window.location.href = 'dashboard.html';
        }
    }

    // ── Form Submit via Enter ──────────────────────────────

    function initFormSubmit() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleLogin();
            });
        }

        const forgotForm = document.getElementById('forgotForm');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleForgotPassword();
            });
        }
    }

    // ── Focus ──────────────────────────────────────────────

    function focusFirstField() {
        const el = document.getElementById('loginEmail');
        if (el) el.focus();
    }

    // ── Login ──────────────────────────────────────────────

    async function handleLogin() {
        const email = document.getElementById('loginEmail');
        const password = document.getElementById('loginPassword');
        const btn = document.getElementById('btnLogin');

        if (!email || !password || !btn) return;

        // Validate
        const emailVal = email.value.trim();
        const passVal = password.value;

        if (!emailVal) {
            showFieldError(email, 'Informe seu email');
            return;
        }
        if (!isValidEmail(emailVal)) {
            showFieldError(email, 'Email inválido');
            return;
        }
        if (!passVal || passVal.length < 6) {
            showFieldError(password, 'Senha deve ter pelo menos 6 caracteres');
            return;
        }

        // Clear errors
        clearFieldErrors();

        // Disable button
        disableBtn(btn, 'Entrando...');

        try {
            const res = await apiPost('/api/auth/login', {
                email: emailVal,
                password: passVal
            });

            if (res.success) {
                const data = res.data;

                // Save session
                saveSession({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    user: data.user,
                    profile: data.profile || null,
                    roles: data.roles || [],
                    logged_at: new Date().toISOString()
                });

                showToast('Login realizado com sucesso!', 'success');

                // Redirect
                const redirectTo = getUrlParam('redirect') || 'dashboard.html';
                setTimeout(() => {
                    window.location.href = redirectTo;
                }, 500);
            } else {
                const errMsg = res.error || res.message || 'Erro ao fazer login';
                showToast(errMsg, 'error');
                enableBtn(btn, 'Entrar');
            }
        } catch (err) {
            showToast('Erro de conexão. Tente novamente.', 'error');
            enableBtn(btn, 'Entrar');
        }
    }

    // ── Forgot Password ────────────────────────────────────

    function showForgotPassword() {
        const loginForm = document.getElementById('loginForm');
        const forgotForm = document.getElementById('forgotForm');
        const authTitle = document.querySelector('.auth-title');
        const authSubtitle = document.querySelector('.auth-subtitle');
        const authFooter = document.querySelector('.auth-footer');

        if (loginForm) loginForm.style.display = 'none';
        if (forgotForm) forgotForm.style.display = 'block';
        if (authTitle) authTitle.textContent = 'Recuperar senha';
        if (authSubtitle) authSubtitle.textContent = 'Enviaremos um link para redefinir sua senha';
        if (authFooter) authFooter.style.display = 'none';

        const forgotEmail = document.getElementById('forgotEmail');
        if (forgotEmail) forgotEmail.focus();
    }

    function showLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const forgotForm = document.getElementById('forgotForm');
        const authTitle = document.querySelector('.auth-title');
        const authSubtitle = document.querySelector('.auth-subtitle');
        const authFooter = document.querySelector('.auth-footer');

        if (loginForm) loginForm.style.display = 'block';
        if (forgotForm) forgotForm.style.display = 'none';
        if (authTitle) authTitle.textContent = 'Bem-vindo de volta';
        if (authSubtitle) authSubtitle.textContent = 'Entre na sua conta para acessar o painel';
        if (authFooter) authFooter.style.display = 'block';

        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.focus();
    }

    async function handleForgotPassword() {
        const email = document.getElementById('forgotEmail');
        const btn = document.getElementById('btnForgot');

        if (!email || !btn) return;

        const emailVal = email.value.trim();

        if (!emailVal) {
            showFieldError(email, 'Informe seu email');
            return;
        }
        if (!isValidEmail(emailVal)) {
            showFieldError(email, 'Email inválido');
            return;
        }

        clearFieldErrors();
        disableBtn(btn, 'Enviando...');

        try {
            const res = await apiPost('/api/auth/reset-password', {
                email: emailVal
            });

            if (res.success) {
                showToast('Link de recuperação enviado! Verifique seu email.', 'success');
                setTimeout(() => {
                    showLoginForm();
                }, 2000);
            } else {
                showToast(res.error || 'Erro ao enviar link', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão. Tente novamente.', 'error');
        } finally {
            enableBtn(btn, 'Enviar Link');
        }
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
        const group = input.closest('.form-group') || input.closest('.input-group')?.parentElement;
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
        handleLogin,
        handleForgotPassword,
        showForgotPassword,
        showLoginForm,
        togglePasswordVisibility
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', LoginPage.init);
