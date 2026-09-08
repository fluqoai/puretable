import assert from "node:assert/strict";
import { test } from "node:test";
import type { Business } from "@/data/businesses";
import { categoryPreviews } from "./home-categories";

const place = (id: string, plan = "free", categories = ["bakery"]) =>
  ({
    id,
    name: id,
    category: categories[0],
    categories,
    plan,
    createdAt: "2026-01-01",
    branches: [],
    city: "Riyadh",
    cover: "",
    products: "",
    description: "",
    address: "",
    lat: null,
    lng: null,
    phone: "",
    links: [],
    hours: { sun: "", mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" },
  }) as Business;

test("homepage caps category previews at three while retaining full counts and plan ranking", () => {
  const places = [
    ...Array.from({ length: 100 }, (_, i) => place(String(i))),
    place("premium", "premium"),
    place("pro", "pro"),
  ];
  const [group] = categoryPreviews(places, [{ value: "bakery" }]);
  assert.equal(group.count, 102);
  assert.equal(group.preview.length, 3);
  assert.deepEqual(
    group.preview.slice(0, 2).map((b) => b.id),
    ["premium", "pro"],
  );
});

test("homepage follows visible registry, includes multi-type places, and preserves empty categories", () => {
  const result = categoryPreviews(
    [place("both", "free", ["bakery", "cafe"])],
    [{ value: "cafe" }, { value: "home" }],
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].preview[0].id, "both");
  assert.equal(result[1].count, 0);
  assert.deepEqual(result[1].preview, []);
});
