import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlanDefinitions } from "@/lib/subscriptions.functions";

export function usePlanDefinitions() {
  const read = useServerFn(getPlanDefinitions);
  return useQuery({
    queryKey: ["plan-definitions"],
    queryFn: () => read(),
    refetchInterval: 30000,
  });
}
