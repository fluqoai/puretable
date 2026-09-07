import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      // This route is client-only because Supabase stores the browser session
      // locally. Use a document redirect so React never tries to hydrate the
      // protected-route placeholder as the sign-in page.
      throw redirect({
        to: "/auth",
        search: { next: location.href },
        replace: true,
        reloadDocument: true,
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
