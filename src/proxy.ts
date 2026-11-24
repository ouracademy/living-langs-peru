import type { NextRequest } from "next/server";

import { adminAuthResponse } from "@/lib/admin/basic-auth";

/**
 * Only the admin area goes through here (see `config.matcher`): public pages,
 * `_next/*` and `public/` never pay for it. Every admin Route Handler checks
 * the credentials again, so this is the first barrier, not the only one.
 *
 * Next allows a single proxy file. Anything another admin page needs goes in a
 * module imported from here, not in a second proxy.
 */
export function proxy(request: NextRequest): Response | undefined {
  return adminAuthResponse(request.headers.get("authorization")) ?? undefined;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
