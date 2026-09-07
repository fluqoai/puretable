import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Business } from "@/data/businesses";
import { buildLocationOptions, discoverBusinesses, NEARBY_RADIUS_KM } from "@/lib/discovery";

function business(id: string, overrides: Partial<Business> = {}): Business {
  return {
    id,
    name: id,
    category: "restaurant",
    categories: ["restaurant"],
    city: "Riyadh",
    city_i18n: { en: "Riyadh", ar: "الرياض" },
    district: "Olaya",
    district_i18n: { en: "Olaya", ar: "العليا" },
    cover: "",
    products: "Pizza",
    description: "",
    address: "",
    lat: 24.7136,
    lng: 46.6753,
    phone: "",
    hours: { sun: "", mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" },
    links: [],
    branches: [],
    plan: "free",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("discovery ordering and filters", () => {
  test("search matching happens before subscription ranking", () => {
    const matchingFree = business("Pizza House");
    const unrelatedPremium = business("Burger House", { plan: "premium", products: "Burger" });
    assert.deepEqual(
      discoverBusinesses([unrelatedPremium, matchingFree], { query: "pizza" }).map(
        (x) => x.business.id,
      ),
      ["Pizza House"],
    );
  });

  test("orders ties by plan, distance, then newest", () => {
    const origin = { lat: 24.7136, lng: 46.6753 };
    const free = business("free-near", {
      plan: "free",
      lat: 24.714,
      createdAt: "2026-09-01T00:00:00Z",
    });
    const proFar = business("pro-far", {
      plan: "pro",
      lat: 24.75,
      createdAt: "2026-09-02T00:00:00Z",
    });
    const proNearOld = business("pro-near-old", {
      plan: "pro",
      lat: 24.715,
      createdAt: "2026-01-01T00:00:00Z",
    });
    const proNearNew = business("pro-near-new", {
      plan: "pro",
      lat: 24.715,
      createdAt: "2026-08-01T00:00:00Z",
    });
    const premium = business("premium", { plan: "premium", lat: 24.8 });
    assert.deepEqual(
      discoverBusinesses([free, proFar, proNearOld, proNearNew, premium], { position: origin }).map(
        (x) => x.business.id,
      ),
      ["premium", "pro-near-new", "pro-near-old", "pro-far", "free-near"],
    );
  });

  test("uses the nearest branch and applies the ten kilometre radius", () => {
    const origin = { lat: 24.7136, lng: 46.6753 };
    const withNearBranch = business("branch-near", {
      lat: 26,
      lng: 50,
      branches: [
        {
          id: "branch",
          name: "Olaya",
          address: "",
          city: "Riyadh",
          district: "Olaya",
          lat: 24.72,
          lng: 46.68,
          hours: { sun: "", mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" },
        },
      ],
    });
    const far = business("far", { lat: 25.2, lng: 46.7 });
    const results = discoverBusinesses([far, withNearBranch], {
      position: origin,
      nearbyOnly: true,
    });
    assert.equal(results.length, 1);
    assert.equal(results[0]?.business.id, "branch-near");
    assert.ok((results[0]?.distance ?? Infinity) < NEARBY_RADIUS_KM);
  });

  test("combines premium, booking, category, city and district filters", () => {
    const match = business("match", {
      plan: "premium",
      offersBooking: true,
      category: "cafe",
      categories: ["cafe"],
    });
    const wrongPlan = business("wrong-plan", {
      plan: "pro",
      offersBooking: true,
      category: "cafe",
      categories: ["cafe"],
    });
    assert.deepEqual(
      discoverBusinesses([wrongPlan, match], {
        premiumOnly: true,
        bookingOnly: true,
        categories: ["cafe"],
        cityKey: "Riyadh",
        districtKey: "Olaya",
      }).map((x) => x.business.id),
      ["match"],
    );
  });

  test("manual location choices always include the three core cities and derive districts from listings", () => {
    const options = buildLocationOptions([business("one")], "ar");
    assert.deepEqual(
      new Set(options.map((option) => option.key)),
      new Set(["riyadh", "jeddah", "dammam"]),
    );
    assert.deepEqual(options.find((option) => option.key === "riyadh")?.districts, [
      { key: "olaya", label: "العليا" },
    ]);
    assert.deepEqual(options.find((option) => option.key === "jeddah")?.districts, []);
  });
});
