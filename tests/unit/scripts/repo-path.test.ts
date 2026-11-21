import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toRepoPath } from "../../../scripts/lib/repo-path";

const root = join(process.cwd(), "repo");

describe("toRepoPath", () => {
  it("turns an absolute lcov path into git's relative form", () => {
    expect(
      toRepoPath(join(root, "src", "lib", "admin", "gallery.ts"), root),
    ).toBe("src/lib/admin/gallery.ts");
  });

  it("leaves an already relative path in git's form", () => {
    expect(toRepoPath("src/proxy.ts", root)).toBe("src/proxy.ts");
  });

  it("never returns a backslash, whatever the platform separator", () => {
    expect(
      toRepoPath(join(root, "src", "app", "admin", "page.tsx"), root),
    ).not.toContain("\\");
  });
});
