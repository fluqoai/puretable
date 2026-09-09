import { createFileRoute } from "@tanstack/react-router";
import { PasswordSettings } from "@/components/site/PasswordSettings";
export const Route = createFileRoute("/_authenticated/admin/account")({
  head: () => ({
    meta: [{ title: "تغيير كلمة المرور — Pure Table" }, { name: "robots", content: "noindex" }],
  }),
  component: PasswordSettings,
});
