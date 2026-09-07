import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

export function registerListCoverageTool(server: McpServer) {
  server.registerTool(
    "list_coverage",
    {
      title: "List directory coverage",
      description:
        "List the cities, regions and categories currently covered by the Pure Table gluten-free directory, with the number of published listings in each.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => {
    const { data, error } = await supabaseAnon()
      .from("businesses")
      .select("city,region,category")
      .eq("published", true);
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };

    const tally = (key: "city" | "region" | "category") => {
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const value = (row as Record<string, string | null>)[key];
        if (!value) continue;
        counts[value] = (counts[value] ?? 0) + 1;
      }
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count }));
    };

    const payload = {
      total: data?.length ?? 0,
      cities: tally("city"),
      regions: tally("region"),
      categories: tally("category"),
    };

    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
    },
  );
}
