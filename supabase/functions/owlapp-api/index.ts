import { createClient } from "npm:@supabase/supabase-js@2.112.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
});

const ok = (data: unknown = null) => reply(200, { success: true, data });
const fail = (status: number, error: string) => reply(status, { success: false, error });

async function body(req: Request) {
  try { return await req.json(); } catch { return {}; }
}

async function currentUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

async function ownedApp(appId: string, userId: string) {
  const { data } = await admin.from("apps").select("*").eq("id", appId).eq("owner_id", userId).maybeSingle();
  return data;
}

function clean<T extends Record<string, unknown>>(value: T, allowed: string[]) {
  return Object.fromEntries(allowed.filter((k) => k in value).map((k) => [k, value[k]]));
}

async function appWithCounts(app: Record<string, unknown>) {
  const appId = String(app.id);
  const [{ count: usersCount }, { count: modulesCount }, { data: slugs }] = await Promise.all([
    admin.from("app_users").select("id", { count: "exact", head: true }).eq("app_id", appId),
    admin.from("modules").select("id", { count: "exact", head: true }).eq("app_id", appId),
    admin.from("app_slugs").select("*").eq("app_id", appId).order("created_at"),
  ]);
  const primary = slugs?.find((s) => s.is_primary) || slugs?.[0];
  return { ...app, slug: primary?.slug || "", slugs: slugs || [], users_count: usersCount || 0, modules_count: modulesCount || 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const marker = "/owlapp-api";
  const path = url.pathname.slice(url.pathname.indexOf(marker) + marker.length).replace(/\/$/, "") || "/";
  const method = req.method;

  try {
    if (path === "/api/health") return ok({ status: "ok" });

    if (path === "/api/auth/register" && method === "POST") {
      const input = await body(req);
      if (!input.email || !input.password || String(input.password).length < 6) return fail(400, "Email e senha válida são obrigatórios.");
      const { data, error } = await admin.auth.admin.createUser({
        email: String(input.email).trim().toLowerCase(),
        password: String(input.password),
        email_confirm: true,
        user_metadata: { name: String(input.name || "") },
      });
      if (error) return fail(400, error.message);
      const login = await admin.auth.signInWithPassword({ email: String(input.email), password: String(input.password) });
      if (login.error) return ok({ user: data.user, requires_confirmation: false });
      return ok({
        user: login.data.user,
        access_token: login.data.session?.access_token,
        refresh_token: login.data.session?.refresh_token,
        profile: { name: input.name || "", email: input.email },
        roles: [],
      });
    }

    if (path === "/api/auth/login" && method === "POST") {
      const input = await body(req);
      const { data, error } = await admin.auth.signInWithPassword({ email: String(input.email || ""), password: String(input.password || "") });
      if (error || !data.session) return fail(401, "Email ou senha inválidos.");
      const { data: profile } = await admin.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      return ok({ user: data.user, access_token: data.session.access_token, refresh_token: data.session.refresh_token, profile, roles: [] });
    }

    if (path === "/api/auth/reset-password" && method === "POST") {
      const input = await body(req);
      const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      const { error } = await client.auth.resetPasswordForEmail(String(input.email || ""), { redirectTo: "https://owlapp-h.pages.dev/login" });
      if (error) return fail(400, error.message);
      return ok({ sent: true });
    }

    const user = await currentUser(req);
    if (!user) return fail(401, "Sessão inválida ou expirada.");

    if (path === "/api/auth/session" && method === "GET") return ok({ valid: true, user_id: user.id });
    if (path === "/api/auth/logout" && method === "POST") return ok({ logged_out: true });
    if (path === "/api/auth/me" && method === "GET") {
      const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: subscription } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return ok({ ...(profile || {}), id: user.id, email: user.email, roles: [], subscription });
    }
    if (path === "/api/subscription/status" && method === "GET") {
      const { data } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return ok(data || { subscription_tier: "basic", status: "active" });
    }

    if (path === "/api/apps/check-slug" && method === "GET") return fail(400, "Slug não informado.");
    const slugCheck = path.match(/^\/api\/apps\/check-slug\/([^/]+)$/);
    if (slugCheck && method === "GET") {
      const slug = decodeURIComponent(slugCheck[1]);
      const { data } = await admin.from("app_slugs").select("id").eq("slug", slug).maybeSingle();
      return ok({ available: !data });
    }

    if (path === "/api/apps" && method === "GET") {
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
      const { data, error } = await admin.from("apps").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(limit);
      if (error) return fail(400, error.message);
      return ok(await Promise.all((data || []).map(appWithCounts)));
    }

    if (path === "/api/apps" && method === "POST") {
      const input = await body(req);
      const appInput = clean(input, ["app_name","description","category","visibility","primary_color","secondary_color","app_icon_url","app_logo_url"]);
      const { data: app, error } = await admin.from("apps").insert({ ...appInput, owner_id: user.id }).select().single();
      if (error) return fail(400, error.message);
      const { error: slugError } = await admin.from("app_slugs").insert({ app_id: app.id, slug: input.slug, is_primary: true });
      if (slugError) { await admin.from("apps").delete().eq("id", app.id); return fail(400, slugError.message); }
      return ok(await appWithCounts(app));
    }

    const appMatch = path.match(/^\/api\/apps\/([0-9a-f-]+)$/i);
    if (appMatch) {
      const app = await ownedApp(appMatch[1], user.id);
      if (!app) return fail(404, "Aplicativo não encontrado.");
      if (method === "GET") return ok(await appWithCounts(app));
      if (method === "PUT") {
        const input = await body(req);
        const update = clean(input, ["app_name","description","category","visibility","status","primary_color","secondary_color","app_icon_url","app_logo_url"]);
        const { data, error } = await admin.from("apps").update(update).eq("id", app.id).select().single();
        return error ? fail(400, error.message) : ok(await appWithCounts(data));
      }
      if (method === "DELETE") {
        const { error } = await admin.from("apps").delete().eq("id", app.id);
        return error ? fail(400, error.message) : ok({ deleted: true });
      }
    }

    const cloneMatch = path.match(/^\/api\/apps\/([0-9a-f-]+)\/clone$/i);
    if (cloneMatch && method === "POST") {
      const source = await ownedApp(cloneMatch[1], user.id);
      if (!source) return fail(404, "Aplicativo não encontrado.");
      const { id: _id, created_at: _c, updated_at: _u, ...copy } = source;
      const { data: app, error } = await admin.from("apps").insert({ ...copy, app_name: `${source.app_name} (Cópia)` }).select().single();
      if (error) return fail(400, error.message);
      const slug = `app-${crypto.randomUUID().slice(0, 8)}`;
      await admin.from("app_slugs").insert({ app_id: app.id, slug, is_primary: true });
      return ok(await appWithCounts(app));
    }

    const settingsMatch = path.match(/^\/api\/apps\/([0-9a-f-]+)\/settings$/i);
    if (settingsMatch && method === "PUT") {
      const app = await ownedApp(settingsMatch[1], user.id); if (!app) return fail(404, "Aplicativo não encontrado.");
      const input = await body(req);
      const update = clean(input, ["login_email_enabled","require_approval","enable_community","enable_feed"]);
      const { data, error } = await admin.from("apps").update(update).eq("id", app.id).select().single();
      return error ? fail(400, error.message) : ok(data);
    }

    const slugsBase = path.match(/^\/api\/apps\/([0-9a-f-]+)\/slugs$/i);
    if (slugsBase) {
      const app = await ownedApp(slugsBase[1], user.id); if (!app) return fail(404, "Aplicativo não encontrado.");
      if (method === "GET") { const { data, error } = await admin.from("app_slugs").select("*").eq("app_id", app.id).order("created_at"); return error ? fail(400,error.message) : ok(data); }
      if (method === "POST") { const input = await body(req); const { data,error }=await admin.from("app_slugs").insert({app_id:app.id,slug:input.slug,is_primary:false}).select().single(); return error?fail(400,error.message):ok(data); }
    }

    const slugItem = path.match(/^\/api\/apps\/([0-9a-f-]+)\/slugs\/([0-9a-f-]+)$/i);
    if (slugItem) {
      const app=await ownedApp(slugItem[1],user.id); if(!app)return fail(404,"Aplicativo não encontrado.");
      if(method==="DELETE"){const {error}=await admin.from("app_slugs").delete().eq("id",slugItem[2]).eq("app_id",app.id);return error?fail(400,error.message):ok({deleted:true});}
      if(method==="PUT"){await admin.from("app_slugs").update({is_primary:false}).eq("app_id",app.id);const {data,error}=await admin.from("app_slugs").update({is_primary:true}).eq("id",slugItem[2]).eq("app_id",app.id).select().single();return error?fail(400,error.message):ok(data);}
    }

    const domainsBase=path.match(/^\/api\/apps\/([0-9a-f-]+)\/domains$/i);
    if(domainsBase){const app=await ownedApp(domainsBase[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");if(method==="GET"){const {data,error}=await admin.from("app_domains").select("*").eq("app_id",app.id);return error?fail(400,error.message):ok(data);}if(method==="POST"){const input=await body(req);const {data,error}=await admin.from("app_domains").insert({app_id:app.id,domain:String(input.domain||"").toLowerCase()}).select().single();return error?fail(400,error.message):ok(data);}}
    const domainItem=path.match(/^\/api\/apps\/([0-9a-f-]+)\/domains\/([0-9a-f-]+)(\/verify)?$/i);
    if(domainItem){const app=await ownedApp(domainItem[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");if(domainItem[3]&&method==="POST")return fail(501,"Verificação automática de DNS ainda não configurada.");if(method==="DELETE"){const {error}=await admin.from("app_domains").delete().eq("id",domainItem[2]).eq("app_id",app.id);return error?fail(400,error.message):ok({deleted:true});}}

    const modulesBase=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules$/i);
    if(modulesBase){const app=await ownedApp(modulesBase[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");if(method==="GET"){const {data,error}=await admin.from("modules").select("*").eq("app_id",app.id).order("position");if(error)return fail(400,error.message);const rows=await Promise.all((data||[]).map(async m=>{const {count}=await admin.from("contents").select("id",{count:"exact",head:true}).eq("module_id",m.id);return{...m,contents_count:count||0};}));return ok(rows);}if(method==="POST"){const input=await body(req);const {count}=await admin.from("modules").select("id",{count:"exact",head:true}).eq("app_id",app.id);const insert=clean(input,["title","description","status","access_type","cover_image_url"]);const {data,error}=await admin.from("modules").insert({...insert,app_id:app.id,position:count||0}).select().single();return error?fail(400,error.message):ok(data);}}
    const modulesReorder=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules\/reorder$/i);
    if(modulesReorder&&method==="PUT"){const app=await ownedApp(modulesReorder[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const input=await body(req);await Promise.all((input.ordered_ids||[]).map((id:string,i:number)=>admin.from("modules").update({position:i}).eq("id",id).eq("app_id",app.id)));return ok({reordered:true});}
    const moduleItem=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules\/([0-9a-f-]+)$/i);
    if(moduleItem){const app=await ownedApp(moduleItem[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const {data:mod}=await admin.from("modules").select("*").eq("id",moduleItem[2]).eq("app_id",app.id).maybeSingle();if(!mod)return fail(404,"Módulo não encontrado.");if(method==="GET")return ok(mod);if(method==="PUT"){const input=await body(req);const update=clean(input,["title","description","status","access_type","cover_image_url"]);const {data,error}=await admin.from("modules").update(update).eq("id",mod.id).select().single();return error?fail(400,error.message):ok(data);}if(method==="DELETE"){const {error}=await admin.from("modules").delete().eq("id",mod.id);return error?fail(400,error.message):ok({deleted:true});}}

    const contentsBase=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules\/([0-9a-f-]+)\/contents$/i);
    if(contentsBase){const app=await ownedApp(contentsBase[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const {data:mod}=await admin.from("modules").select("id").eq("id",contentsBase[2]).eq("app_id",app.id).maybeSingle();if(!mod)return fail(404,"Módulo não encontrado.");if(method==="GET"){const {data,error}=await admin.from("contents").select("*").eq("module_id",mod.id).order("position");return error?fail(400,error.message):ok(data);}if(method==="POST"){const input=await body(req);const {count}=await admin.from("contents").select("id",{count:"exact",head:true}).eq("module_id",mod.id);const insert=clean(input,["title","description","content_type","status","is_free","video_url","duration_minutes","text_body","image_url","audio_url","file_url","file_name","embed_url","embed_code","quiz_url","paint_bg_url","thumbnail_url"]);const {data,error}=await admin.from("contents").insert({...insert,module_id:mod.id,position:count||0}).select().single();return error?fail(400,error.message):ok(data);}}
    const contentsReorder=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules\/([0-9a-f-]+)\/contents\/reorder$/i);
    if(contentsReorder&&method==="PUT"){const app=await ownedApp(contentsReorder[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const input=await body(req);await Promise.all((input.ordered_ids||[]).map((id:string,i:number)=>admin.from("contents").update({position:i}).eq("id",id).eq("module_id",contentsReorder[2])));return ok({reordered:true});}
    const contentItem=path.match(/^\/api\/apps\/([0-9a-f-]+)\/modules\/([0-9a-f-]+)\/contents\/([0-9a-f-]+)$/i);
    if(contentItem){const app=await ownedApp(contentItem[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const {data:item}=await admin.from("contents").select("*").eq("id",contentItem[3]).eq("module_id",contentItem[2]).maybeSingle();if(!item)return fail(404,"Conteúdo não encontrado.");if(method==="PUT"){const input=await body(req);const update=clean(input,["title","description","content_type","status","is_free","video_url","duration_minutes","text_body","image_url","audio_url","file_url","file_name","embed_url","embed_code","quiz_url","paint_bg_url","thumbnail_url"]);const {data,error}=await admin.from("contents").update(update).eq("id",item.id).select().single();return error?fail(400,error.message):ok(data);}if(method==="DELETE"){const {error}=await admin.from("contents").delete().eq("id",item.id);return error?fail(400,error.message):ok({deleted:true});}}

    const usersBase=path.match(/^\/api\/apps\/([0-9a-f-]+)\/users$/i);
    if(usersBase){const app=await ownedApp(usersBase[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");if(method==="GET"){const {data,error}=await admin.from("app_users").select("*").eq("app_id",app.id).order("created_at",{ascending:false});return error?fail(400,error.message):ok(data);}if(method==="POST"){const input=await body(req);const insert=clean(input,["name","email","phone","status"]);const {data,error}=await admin.from("app_users").insert({...insert,app_id:app.id}).select().single();return error?fail(400,error.message):ok(data);}}
    const userAccess=path.match(/^\/api\/apps\/([0-9a-f-]+)\/users\/([0-9a-f-]+)\/access$/i);
    if(userAccess){const app=await ownedApp(userAccess[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");const {data:u}=await admin.from("app_users").select("id").eq("id",userAccess[2]).eq("app_id",app.id).maybeSingle();if(!u)return fail(404,"Usuário não encontrado.");if(method==="GET"){const {data,error}=await admin.from("app_user_access").select("*").eq("app_user_id",u.id);return error?fail(400,error.message):ok(data);}if(method==="PUT"){const input=await body(req);await admin.from("app_user_access").delete().eq("app_user_id",u.id);if((input.module_ids||[]).length){const {error}=await admin.from("app_user_access").insert(input.module_ids.map((module_id:string)=>({app_user_id:u.id,module_id})));if(error)return fail(400,error.message);}return ok({updated:true});}}
    const userItem=path.match(/^\/api\/apps\/([0-9a-f-]+)\/users\/([0-9a-f-]+)$/i);
    if(userItem){const app=await ownedApp(userItem[1],user.id);if(!app)return fail(404,"Aplicativo não encontrado.");if(method==="PUT"){const input=await body(req);const update=clean(input,["name","phone","status","notes"]);const {data,error}=await admin.from("app_users").update(update).eq("id",userItem[2]).eq("app_id",app.id).select().single();return error?fail(400,error.message):ok(data);}if(method==="DELETE"){const {error}=await admin.from("app_users").delete().eq("id",userItem[2]).eq("app_id",app.id);return error?fail(400,error.message):ok({deleted:true});}}

    return fail(404, "Rota não encontrada.");
  } catch (error) {
    console.error(error);
    return fail(500, "Erro interno do servidor.");
  }
});
