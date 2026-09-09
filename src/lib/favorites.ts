/**
 * Saved places ("favourites").
 *
 * Rows live in `public.favorites` and are protected by RLS, so every query
 * here only ever sees the signed-in visitor's own list.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FAVORITES_KEY = ["favorites"] as const;

/** The signed-in user id, or null while signed out. */
export function useAuthUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setUserId(data.user?.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, session) => {
      if (e === "SIGNED_IN" || e === "SIGNED_OUT" || e === "USER_UPDATED") {
        setUserId(session?.user?.id ?? null);
      }
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { userId, ready };
}

/** Set of business uuids the current user saved. */
export function useFavoriteIds() {
  const { userId, ready } = useAuthUser();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...FAVORITES_KEY, userId ?? "anon"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("business_id")
        .eq("user_id", userId!);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.business_id as string);
    },
  });
  return { userId, ready, isLoading, error, refetch, ids: new Set(data ?? []) };
}

export function useToggleFavorite(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, on }: { businessId: string; on: boolean }) => {
      if (!userId) throw new Error("not signed in");
      if (on) {
        const { error } = await supabase
          .from("favorites")
          .upsert(
            { user_id: userId, business_id: businessId },
            { onConflict: "user_id,business_id", ignoreDuplicates: true },
          );
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("business_id", businessId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}
