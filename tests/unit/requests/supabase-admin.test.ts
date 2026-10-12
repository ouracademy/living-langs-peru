import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// "server-only" throws outside a server bundle, which is exactly what jsdom is.
vi.mock("server-only", () => ({}));

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseAdmin", () => {
  it("does not throw when imported without the variables", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(import("@/lib/supabase-admin")).resolves.toBeDefined();
  });

  it.each([
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"],
  ])("throws when %s is missing", async (missing, present) => {
    vi.stubEnv(missing, "");
    vi.stubEnv(present, "https://example.supabase.co");
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");

    expect(() => getSupabaseAdmin()).toThrow(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  });

  it("builds the client once and reuses it", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const { getSupabaseAdmin } = await import("@/lib/supabase-admin");

    const first = getSupabaseAdmin();

    expect(first).toBe(getSupabaseAdmin());
    expect(typeof first.from).toBe("function");
  });
});
