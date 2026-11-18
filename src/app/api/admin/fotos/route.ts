import { adminAuthResponse } from "@/lib/admin/basic-auth";
import {
  GALLERY_ERROR_MESSAGES,
  type GalleryErrorCode,
  readGallery,
} from "@/lib/admin/gallery-source";
import { readGitHubConfig } from "@/lib/admin/github";

const STATUS: Record<GalleryErrorCode, number> = {
  github_not_configured: 503,
  github_unauthorized: 502,
  github_unavailable: 502,
  gallery_unreadable: 502,
};

/**
 * The gallery as it is on the branch right now, not as the running deployment
 * built it: an editor sees their last save even while Vercel is still
 * publishing (spec #10).
 */
export async function GET(request: Request): Promise<Response> {
  // Checked again here on purpose: the proxy matcher is not the only barrier.
  const denied = adminAuthResponse(request.headers.get("authorization"));
  if (denied) return denied;

  const result = await readGallery(readGitHubConfig(), fetch);
  if (!result.ok) {
    // The code only: never the token, the URL or the GitHub message.
    console.error("admin/fotos: read failed", result.error);
    return Response.json(
      { error: result.error, message: GALLERY_ERROR_MESSAGES[result.error] },
      {
        status: STATUS[result.error],
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(result.value, {
    headers: { "Cache-Control": "no-store" },
  });
}
