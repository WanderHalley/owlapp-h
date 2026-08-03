# OwlApp

Frontend estático do OwlApp.

## Configuração obrigatória da API

Login, cadastro, dashboard e gerenciamento usam a Edge Function `owlapp-api`
do projeto Supabase. A URL de produção já está definida em `js/app.js`.

```html
<script>window.OWLAPP_API_URL = 'https://sua-api.exemplo.com';</script>
<script src="js/app.js"></script>
```

Como alternativa temporária no navegador:

```js
localStorage.setItem('owlapp_api_url', 'https://sua-api.exemplo.com');
```

O esquema está versionado em `supabase/migrations` e a API em
`supabase/functions/owlapp-api`.

## Cloudflare Pages

Este repositório não exige build. Publique a raiz (`.`) como diretório de saída.
