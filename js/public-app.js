const PublicAppPage = (() => {
    function getSlug() {
        const parts = window.location.pathname.split('/').filter(Boolean);
        return parts[0] === 'app' ? decodeURIComponent(parts.slice(1).join('/')) : getUrlParam('slug');
    }

    async function init() {
        initTheme();
        const slug = getSlug();
        if (!slug) return showError('Endereço do app inválido.');
        const response = await apiGet(`/api/public/apps/${encodeURIComponent(slug)}`);
        if (!response.success) return showError(response.error || 'Não foi possível abrir este app.');
        render(response.data);
    }

    function render(app) {
        document.title = `${app.app_name} – OwlApp`;
        document.documentElement.style.setProperty('--primary', app.primary_color || '#7c3aed');
        document.documentElement.style.setProperty('--primary-hover', app.primary_color || '#7c3aed');
        document.getElementById('appThemeColor')?.setAttribute('content', app.primary_color || '#7c3aed');
        document.getElementById('publicAppName').textContent = app.app_name || 'App';
        document.getElementById('publicAppDescription').textContent = app.description || '';

        const icon = document.getElementById('publicAppIcon');
        if (app.app_icon_url) icon.innerHTML = `<img src="${escapeHtml(app.app_icon_url)}" alt="">`;
        else icon.textContent = (app.app_name || 'A').charAt(0).toUpperCase();
        icon.style.background = app.primary_color || '#7c3aed';

        const logo = document.getElementById('publicAppLogo');
        if (app.app_logo_url) { logo.src = app.app_logo_url; logo.style.display = ''; }

        const modules = document.getElementById('publicAppModules');
        if (!app.modules?.length) {
            modules.innerHTML = '<div class="public-app-empty">Este app ainda não possui conteúdos publicados.</div>';
        } else {
            modules.innerHTML = app.modules.map(module => `
                <article class="public-module-card">
                    <div class="public-module-header">
                        <h3>${escapeHtml(module.title || 'Módulo')}</h3>
                        ${module.description ? `<p>${escapeHtml(module.description)}</p>` : ''}
                    </div>
                    <div class="public-content-list">
                        ${(module.contents || []).length ? module.contents.map(renderContent).join('') : '<span class="text-muted">Nenhum conteúdo publicado.</span>'}
                    </div>
                </article>`).join('');
        }

        document.getElementById('publicAppLoading').style.display = 'none';
        document.getElementById('publicAppContent').style.display = '';
    }

    function renderContent(content) {
        const link = content.video_url || content.audio_url || content.file_url || content.embed_url || content.quiz_url;
        return `<div class="public-content-item">
            <div><strong>${escapeHtml(content.title || 'Conteúdo')}</strong>${content.description ? `<p>${escapeHtml(content.description)}</p>` : ''}</div>
            ${link ? `<a class="btn btn-primary btn-sm" href="${escapeHtml(link)}" target="_blank" rel="noopener">Abrir</a>` : ''}
        </div>`;
    }

    function showError(message) {
        document.getElementById('publicAppLoading').style.display = 'none';
        const error = document.getElementById('publicAppError');
        error.textContent = message;
        error.style.display = '';
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', PublicAppPage.init);
