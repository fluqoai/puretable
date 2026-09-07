import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Returns whether current user is admin.
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: !!data, userId: context.userId };
  });

// Bootstrap: if there are no admins yet, promote the current signed-in user.
// Safe to call from the client; the check happens server-side using the admin
// client to bypass RLS for this one write.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) return { granted: false, reason: "admin_exists" as const };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true };
  });

// Signed uploads keep writes admin-only; reads use the bucket's public asset URL.
export const signCoverUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filename: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdminRow } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminRow) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const path = `${Date.now()}-${data.filename.replace(/[^\w.-]+/g, "_")}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("business-covers")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    const publicBase = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
    if (!publicBase) throw new Error("Missing SUPABASE_URL");
    const readUrl = `${publicBase}/storage/v1/object/public/business-covers/${encodeURIComponent(path)}`;
    return { uploadUrl: signed.signedUrl, token: signed.token, path, readUrl };
  });
