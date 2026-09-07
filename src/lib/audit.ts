/**
 * Admin / editor audit log.
 *
 * Everything an admin or editor does to the site is recorded here — separately
 * from the customer analytics, which never counts admin activity.
 */
import { supabase } from "@/integrations/supabase/client";

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string | null,
  entityLabel?: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("admin_audit_log").insert({
      user_id: user.id,
      user_email: user.email ?? null,
      action,
      entity,
      entity_id: entityId ?? null,
      entity_label: entityLabel ?? null,
      details: details as never,
    });
  } catch {
    /* the audit log must never block an admin action */
  }
}
