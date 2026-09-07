import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { supabaseAnon } from "../supabase";

const FIELDS =
  "slug,name,name_ar,category,city,city_ar,region,address,description,products,dedicated_gf,verified,website,instagram,phone,maps_url,cover_url,no_location";

const inputSchema = z.object({
  query: z.string().trim().describe("Free-text search over business name, description and products.").optional(),
  city: z.string().trim().describe("City name in English or Arabic, e.g. Riyadh.").optional(),
  region: z.string().trim().describe("Saudi region, e.g. Riyadh Region, Makkah Region.").optional(),
  category: z
    .enum(["restaurant", "cafe", "bakery", "dessert", "supermarket", "home"])
    .describe("Business category ('home' means home business).")
    .optional(),
  dedicated_gf: z.boolean().describe("Only 100% dedicated gluten-free places.").optional(),
  limit: z.number().int().describe("Maximum results to return (1-50, default 20).").optional(),
});

export function registerSearchPlacesTool(server: McpServer) {
  server.registerTool(
    "search_gluten_free_places",
    {
      title: "Search gluten-free places",
      description:
        "Search the Pure Table directory of gluten-free friendly restaurants, cafes, bakeries, desserts, supermarkets and home businesses in Saudi Arabia. Filter by free text, city, region, category, or dedicated (100% gluten-free) kitchens.",
      inputSchema,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ query, city, region, category, dedicated_gf, limit }) => {
    const take = Math.min(Math.max(limit ?? 20, 1), 50);
    let q = supabaseAnon().from("businesses").select(FIELDS).eq("published", true);

    if (city) q = q.or(`city.ilike.%${city}%,city_ar.ilike.%${city}%`);
    if (region) q = q.ilike("region", `%${region}%`);
    if (category) q = q.eq("category", category);
    if (dedicated_gf) q = q.eq("dedicated_gf", true);
    if (query) {
      const t = query.replace(/[,()]/g, " ");
      q = q.or(
        `name.ilike.%${t}%,name_ar.ilike.%${t}%,description.ilike.%${t}%,products.ilike.%${t}%`,
      );
    }

    const { data, error } = await q.order("verified", { ascending: false }).limit(take);
    if (error) return { isError: true, content: [{ type: "text", text: error.message }] };

    const results = (data ?? []).map((b) => ({
      ...b,
      url: `https://puretable.co/business/${b.slug}`,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: results.length, results }, null, 2) }],
      structuredContent: { count: results.length, results },
    };
    },
  );
}
