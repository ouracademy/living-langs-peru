import { collectFieldErrors, requestSchema } from "@/lib/requests/schema";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SUCCESS_MESSAGE =
  "¡Gracias! Recibimos tu solicitud y te contactaremos pronto.";

function success(): Response {
  return Response.json({ ok: true, message: SUCCESS_MESSAGE });
}

function failure(
  status: number,
  error: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return Response.json({ error, message, ...extra }, { status });
}

function serverError(): Response {
  return failure(
    500,
    "server_error",
    "No pudimos guardar tu solicitud. Intenta de nuevo más tarde.",
  );
}

// Bots fill every field they find; a person never sees this one.
function hasHoneypotContent(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const website = (body as Record<string, unknown>).website;
  if (typeof website === "string") return website.trim() !== "";
  return website !== undefined && website !== null && website !== false;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure(
      400,
      "invalid_json",
      "No pudimos leer tu solicitud. Intenta de nuevo.",
    );
  }

  // Same response as a real success, so a bot cannot tell it was caught.
  if (hasHoneypotContent(body)) return success();

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return failure(400, "validation_error", "Revisa los campos marcados.", {
      fields: collectFieldErrors(parsed.error),
    });
  }

  // The URL and the table speak Spanish; the code does not.
  const {
    nombre: name,
    telefono: phone,
    email,
    rol: role,
    motivo: reason,
  } = parsed.data;

  try {
    const { error } = await getSupabaseAdmin()
      .from("solicitudes")
      .insert({
        nombre: name,
        telefono: phone,
        email: email ?? null,
        rol: role,
        motivo: reason,
        consentimiento: true,
      });
    if (error) {
      // Only the code: the message and details can quote the row (personal data).
      console.error("solicitudes: insert failed", error.code);
      return serverError();
    }
  } catch (error) {
    console.error(
      "solicitudes: insert threw",
      error instanceof Error ? error.message : "unknown error",
    );
    return serverError();
  }

  return success();
}
