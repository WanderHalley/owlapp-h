/* ============================================================
   js/landing.js – OwlApp Landing Page
   ============================================================ */

const LandingPage = (() => {

    // ── State ──────────────────────────────────────────────
    let isYearly = false;
    let mobileMenuOpen = false;
    let statsAnimated = false;

    // ── Data ───────────────────────────────────────────────

    const FEATURES = [
        {
            icon: 'smartphone',
            title: 'App Mobile-First',
            description: 'Interface otimizada para celular com navegação intuitiva, design responsivo e experiência nativa.'
        },
        {
            icon: 'layers',
            title: 'Módulos & Conteúdos',
            description: 'Organize seu material em módulos com aulas em vídeo, texto, imagens e downloads.'
        },
        {
            icon: 'newspaper',
            title: 'Feed de Novidades',
            description: 'Publique atualizações, novidades e conteúdos rápidos para manter seus alunos engajados.'
        },
        {
            icon: 'messageCircle',
            title: 'Comunidade',
            description: 'Espaço para interação entre seus alunos com posts, comentários e engajamento.'
        },
        {
            icon: 'bell',
            title: 'Notificações',
            description: 'Envie avisos e notificações push para todos os usuários do seu app.'
        },
        {
            icon: 'plug',
            title: 'Integrações',
            description: 'Conecte com Hotmart, Kiwify, Eduzz, Monetizze e Braip via webhooks automáticos.'
        },
        {
            icon: 'palette',
            title: 'Personalização Total',
            description: 'Cores, logo, ícone, nome — seu app com a cara da sua marca, sem precisar de designer.'
        },
        {
            icon: 'shield',
            title: 'Controle de Acesso',
            description: 'Gerencie seus alunos com aprovação, bloqueio e acesso por módulo individual.'
        },
        {
            icon: 'barChart',
            title: 'Painel Completo',
            description: 'Dashboard com métricas de usuários, visualizações, engajamento e crescimento.'
        }
    ];

    const PLANS = [
        {
            key: 'basic',
            name: 'Basic',
            description: 'Para quem está começando',
            monthly: 0,
            yearly: 0,
            popular: false,
            features: [
                '1 app',
                'Até 50 usuários',
                '3 módulos',
                'Feed e Comunidade',
                'Suporte por email'
            ],
            cta: 'Começar Grátis',
            ctaVariant: 'btn-secondary'
        },
        {
            key: 'starter',
            name: 'Starter',
            description: 'Para criadores em crescimento',
            monthly: 29.90,
            yearly: 23.90,
            popular: false,
            features: [
                '3 apps',
                'Até 500 usuários',
                'Módulos ilimitados',
                'Feed, Comunidade, Notificações',
                'Integrações webhook',
                'Domínio personalizado',
                'Suporte prioritário'
            ],
            cta: 'Assinar Starter',
            ctaVariant: 'btn-primary'
        },
        {
            key: 'professional',
            name: 'Professional',
            description: 'Para profissionais sérios',
            monthly: 59.90,
            yearly: 47.90,
            popular: true,
            features: [
                '10 apps',
                'Até 5.000 usuários',
                'Tudo do Starter',
                'Formulários e enquetes',
                'Analytics avançado',
                'Marca 100% própria',
                'Suporte via WhatsApp'
            ],
            cta: 'Assinar Professional',
            ctaVariant: 'btn-gradient'
        },
        {
            key: 'business',
            name: 'Business',
            description: 'Para grandes operações',
            monthly: 119.90,
            yearly: 95.90,
            popular: false,
            features: [
                'Apps ilimitados',
                'Usuários ilimitados',
                'Tudo do Professional',
                'API de integração',
                'Multi-admin',
                'SLA garantido',
                'Gerente de conta dedicado'
            ],
            cta: 'Assinar Business',
            ctaVariant: 'btn-primary'
        }
    ];

    const FAQ_ITEMS = [
        {
            question: 'Preciso saber programar para criar meu app?',
            answer: 'Não! O OwlApp é uma plataforma 100% no-code. Você configura tudo através de um painel visual intuitivo — nome, cores, módulos, conteúdos e muito mais.'
        },
        {
            question: 'Como meus alunos acessam o app?',
            answer: 'Seus alunos acessam através de um link único (ex: owlapp.com/app/seu-app). Funciona como um Progressive Web App (PWA) direto no navegador, sem precisar baixar da loja.'
        },
        {
            question: 'Posso integrar com minha plataforma de vendas?',
            answer: 'Sim! O OwlApp se integra automaticamente com Hotmart, Kiwify, Eduzz, Monetizze e Braip. Quando um aluno compra, o acesso é liberado automaticamente via webhook.'
        },
        {
            question: 'O plano gratuito tem alguma limitação?',
            answer: 'O plano Basic permite 1 app com até 50 usuários e 3 módulos. É ideal para testar a plataforma. Quando precisar crescer, é só fazer upgrade.'
        },
        {
            question: 'Posso usar meu próprio domínio?',
            answer: 'Sim! A partir do plano Starter, você pode conectar um domínio personalizado para que seus alunos acessem seu app pelo seu próprio endereço.'
        },
        {
            question: 'Como funciona o pagamento?',
            answer: 'Utilizamos o Stripe para processar pagamentos de forma segura. Você pode escolher entre planos mensais ou anuais (com 20% de desconto).'
        },
        {
            question: 'Posso cancelar a qualquer momento?',
            answer: 'Sim, você pode cancelar sua assinatura a qualquer momento diretamente no painel. O acesso continua até o fim do período pago.'
        },
        {
            question: 'Meus dados estão seguros?',
            answer: 'Sim! Utilizamos Supabase com PostgreSQL, criptografia em trânsito (HTTPS) e controle de acesso por JWT. Seus dados e os de seus alunos estão protegidos.'
        }
    ];

    // ── Init ───────────────────────────────────────────────

    function init() {
        initTheme();
        renderFeatures();
        renderPricing();
        renderFAQ();
        setFooterYear();
        initScrollEffects();
        initNavbarScroll();
        checkAuthRedirect();
    }

    // ── Auth Redirect ──────────────────────────────────────

    function checkAuthRedirect() {
        const session = getSession();
        if (session && session.access_token) {
            const btnLogin = document.getElementById('btnLoginNav');
            const btnCadastro = document.getElementById('btnCadastroNav');
            if (btnLogin) {
                btnLogin.textContent = 'Dashboard';
                btnLogin.href = 'dashboard.html';
            }
            if (btnCadastro) {
                btnCadastro.textContent = 'Meu Painel';
                btnCadastro.href = 'dashboard.html';
            }
        }
    }

    // ── Navbar Scroll ──────────────────────────────────────

    function initNavbarScroll() {
        const navbar = document.getElementById('landingNavbar');
        if (!navbar) return;

        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.scrollY;
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // ── Mobile Menu ────────────────────────────────────────

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
        const menu = document.getElementById('landingMobileMenu');
        if (menu) {
            menu.classList.toggle('open', mobileMenuOpen);
        }
    }

    function closeMobileMenu() {
        mobileMenuOpen = false;
        const menu = document.getElementById('landingMobileMenu');
        if (menu) {
            menu.classList.remove('open');
        }
    }

    // ── Features ───────────────────────────────────────────

    function renderFeatures() {
        const grid = document.getElementById('featuresGrid');
        if (!grid) return;

        grid.innerHTML = FEATURES.map(f => `
            <div class="landing-feature-card">
                <div class="landing-feature-icon">
                    ${SVG_ICONS[f.icon] || ''}
                </div>
                <h3 class="landing-feature-title">${escapeHtml(f.title)}</h3>
                <p class="landing-feature-desc">${escapeHtml(f.description)}</p>
            </div>
        `).join('');
    }

    // ── Pricing ────────────────────────────────────────────

    function renderPricing() {
        const grid = document.getElementById('pricingGrid');
        if (!grid) return;

        grid.innerHTML = PLANS.map(plan => {
            const price = isYearly ? plan.yearly : plan.monthly;
            const period = isYearly ? '/mês (anual)' : '/mês';
            const isFree = price === 0;

            return `
                <div class="landing-pricing-card ${plan.popular ? 'popular' : ''}">
                    ${plan.popular ? '<div class="landing-pricing-popular-badge">Mais Popular</div>' : ''}
                    <div class="landing-pricing-header">
                        <h3 class="landing-pricing-name">${escapeHtml(plan.name)}</h3>
                        <p class="landing-pricing-description">${escapeHtml(plan.description)}</p>
                    </div>
                    <div class="landing-pricing-price">
                        ${isFree 
                            ? '<span class="landing-pricing-amount">Grátis</span>' 
                            : `<span class="landing-pricing-currency">R$</span>
                               <span class="landing-pricing-amount">${price.toFixed(2).replace('.', ',')}</span>
                               <span class="landing-pricing-period">${period}</span>`
                        }
                    </div>
                    <ul class="landing-pricing-features">
                        ${plan.features.map(feat => `
                            <li class="landing-pricing-feature">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                ${escapeHtml(feat)}
                            </li>
                        `).join('')}
                    </ul>
                    <a href="cadastro.html${!isFree ? '?plan=' + plan.key + '&billing=' + (isYearly ? 'yearly' : 'monthly') : ''}" 
                       class="btn ${plan.ctaVariant} btn-lg landing-pricing-cta">
                        ${escapeHtml(plan.cta)}
                    </a>
                </div>
            `;
        }).join('');
    }

    function toggleBilling() {
        const toggle = document.getElementById('billingToggleInput');
        isYearly = toggle ? toggle.checked : !isYearly;

        const monthlyLabel = document.getElementById('billingMonthlyLabel');
        const yearlyLabel = document.getElementById('billingYearlyLabel');

        if (monthlyLabel) monthlyLabel.classList.toggle('active', !isYearly);
        if (yearlyLabel) yearlyLabel.classList.toggle('active', isYearly);

        renderPricing();
    }

    // ── FAQ ────────────────────────────────────────────────

    function renderFAQ() {
        const list = document.getElementById('faqList');
        if (!list) return;

        list.innerHTML = FAQ_ITEMS.map((item, i) => `
            <div class="accordion-item" id="faqItem${i}">
                <button class="accordion-header" onclick="LandingPage.toggleFAQ(${i})">
                    <span>${escapeHtml(item.question)}</span>
                    <svg class="accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="accordion-body">
                    <p>${escapeHtml(item.answer)}</p>
                </div>
            </div>
        `).join('');
    }

    function toggleFAQ(index) {
        const item = document.getElementById(`faqItem${index}`);
        if (!item) return;

        const wasOpen = item.classList.contains('open');

        // Close all
        document.querySelectorAll('.accordion-item.open').forEach(el => {
            el.classList.remove('open');
        });

        // Toggle clicked
        if (!wasOpen) {
            item.classList.add('open');
        }
    }

    // ── Scroll Effects (Intersection Observer) ─────────────

    function initScrollEffects() {
        // Animate stats on scroll
        const heroStats = document.getElementById('heroStats');
        if (heroStats) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !statsAnimated) {
                        statsAnimated = true;
                        animateStats();
                    }
                });
            }, { threshold: 0.5 });
            observer.observe(heroStats);
        }

        // Fade-in elements
        const fadeElements = document.querySelectorAll(
            '.landing-feature-card, .landing-pricing-card, .accordion-item, .landing-section-header'
        );
        if (fadeElements.length > 0) {
            const fadeObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in-visible');
                        fadeObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

            fadeElements.forEach(el => {
                el.classList.add('fade-in-element');
                fadeObserver.observe(el);
            });
        }
    }

    function animateStats() {
        animateNumber('statApps', 0, 247, 2000);
        animateNumber('statCreators', 0, 89, 2000);
        animateNumber('statUsers', 0, 3420, 2000);
    }

    function animateNumber(elementId, start, end, duration) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const range = end - start;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + range * eased);

            el.textContent = current.toLocaleString('pt-BR');

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // ── Footer Year ────────────────────────────────────────

    function setFooterYear() {
        const el = document.getElementById('footerYear');
        if (el) {
            el.textContent = new Date().getFullYear();
        }
    }

    // ── Smooth Scroll for anchor links ─────────────────────

    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (!link) return;

        const targetId = link.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    // ── Public API ─────────────────────────────────────────

    return {
        init,
        toggleMobileMenu,
        closeMobileMenu,
        toggleBilling,
        toggleFAQ
    };

})();

// ── Boot ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', LandingPage.init);
