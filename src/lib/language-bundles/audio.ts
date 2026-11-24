/**
 * Public URL of the project's `audio` bucket, which `validateBundle` needs to
 * tell an audio of ours from any other URL. `null` without SUPABASE_URL.
 */
export function audioBaseUrlFrom(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  const url = env.SUPABASE_URL?.trim();
  if (!url) return null;
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/audio/`;
}
