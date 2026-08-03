# OwlApp

Frontend estático do OwlApp.

## Configuração obrigatória da API

Login, cadastro, dashboard e gerenciamento dependem de um backend externo. Antes
de `js/app.js`, defina a URL HTTPS real da API:

```html
<script>window.OWLAPP_API_URL = 'https://sua-api.exemplo.com';</script>
<script src="js/app.js"></script>
```

Como alternativa temporária no navegador:

```js
localStorage.setItem('owlapp_api_url', 'https://sua-api.exemplo.com');
```

Sem uma API implementando as rotas `/api/auth/*`, `/api/apps/*` e demais rotas
usadas pelos arquivos JavaScript, apenas a landing page e os formulários podem
ser exibidos; autenticação e dados reais não funcionarão.

## Cloudflare Pages

Este repositório não exige build. Publique a raiz (`.`) como diretório de saída.
