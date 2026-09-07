import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fetchPublicBusinessBySlug, fetchPublicBusinesses } from "@/lib/businesses.server";

export const listBusinesses = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublicBusinesses();
});

export const getBusinessBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }) => {
    return fetchPublicBusinessBySlug(data.slug);
  });
