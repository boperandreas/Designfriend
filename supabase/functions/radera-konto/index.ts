// Edge function: deletes the signed-in user's account and all their data.
// Photos in storage and in Anthropic's Files API are removed first; deleting the auth user then cascades
// to every table (projekt, bild, meddelande, projektminne).

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { deleteFile } from "../_shared/anthropic.ts";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Bara POST stöds." });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer /i, "");
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!serviceKey) return json(500, { error: "Serverns nyckel saknas." });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json(401, { error: "Du behöver logga in." });
  const uid = data.user.id;

  // Remove the user's photos from Anthropic's Files API.
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  const { data: filer } = await admin.from("bild").select("anthropic_file_id").eq("user_id", uid)
    .not("anthropic_file_id", "is", null);
  if (apiKey) {
    await Promise.all((filer ?? []).map((f) => deleteFile(f.anthropic_file_id as string, apiKey)));
  }

  // Remove every photo under the user's folder (uid/projekt/fil.jpg).
  const { data: mappar } = await admin.storage.from("bilder").list(uid, { limit: 1000 });
  for (const mapp of mappar ?? []) {
    const { data: objekt } = await admin.storage.from("bilder").list(`${uid}/${mapp.name}`, { limit: 1000 });
    const sokvagar = (objekt ?? []).map((f) => `${uid}/${mapp.name}/${f.name}`);
    if (sokvagar.length) await admin.storage.from("bilder").remove(sokvagar);
  }

  const { error: delError } = await admin.auth.admin.deleteUser(uid);
  if (delError) return json(500, { error: "Kontot kunde inte raderas." });
  return json(200, { ok: true });
});
