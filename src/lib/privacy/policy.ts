// The text of /privacidad. docs/politica-privacidad.md is the source of truth
// and tests/unit/privacy/policy.test.ts fails if the two drift apart, so edit
// the document first and mirror the change here.

export type PolicyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

export type PolicySection = {
  /** URL anchor, in Spanish like the rest of the site's anchors. */
  id: string;
  title: string;
  blocks: PolicyBlock[];
};

export type PrivacyPolicy = {
  title: string;
  updatedAt: string;
  intro: string;
  sections: PolicySection[];
};

export const privacyPolicy: PrivacyPolicy = {
  title: "Política de privacidad",
  updatedAt: "12/10/26",
  intro:
    "Esta política explica qué datos personales recogemos cuando envías el formulario de «Crear cuenta» o «Donar» en Living Langs Peru, para qué los usamos y cómo puedes pedir que los borremos.",
  sections: [
    {
      id: "responsable",
      title: "1. Quién es responsable",
      blocks: [
        { kind: "paragraph", text: "Arthur Mauricio Delgadillo, UNMSM" },
        {
          kind: "paragraph",
          text: "Contacto para temas de datos personales: amd11dot4@gmail.com",
        },
      ],
    },
    {
      id: "datos",
      title: "2. Qué datos recogemos",
      blocks: [
        { kind: "paragraph", text: "Cuando envías el formulario guardamos:" },
        {
          kind: "list",
          items: [
            "**Nombre** y **teléfono** (obligatorios).",
            "**Correo electrónico** (opcional).",
            "**Rol** que elegiste: donador o editor.",
            "**Motivo**: el texto que escribes sobre por qué quieres apoyar.",
            "Que **aceptaste** esta política y la fecha y hora del envío.",
          ],
        },
        {
          kind: "paragraph",
          text: "No guardamos tu dirección IP junto con tu solicitud.",
        },
        {
          kind: "paragraph",
          text: "No usamos cookies de seguimiento ni herramientas de publicidad en este formulario.",
        },
      ],
    },
    {
      id: "finalidad",
      title: "3. Para qué los usamos",
      blocks: [
        {
          kind: "paragraph",
          text: "Únicamente para **contactarte sobre tu solicitud**: para invitarte a colaborar como editor o para conversar sobre tu interés en donar. No los usamos para publicidad, no los vendemos y no los cedemos a terceros para sus propios fines.",
        },
      ],
    },
    {
      id: "base",
      title: "4. Con qué base",
      blocks: [
        {
          kind: "paragraph",
          text: "Con tu **consentimiento**, que das al marcar la casilla antes de enviar. Si no la marcas, no podemos guardar tus datos y el formulario no se envía.",
        },
      ],
    },
    {
      id: "proveedores",
      title: "5. Quién más interviene",
      blocks: [
        {
          kind: "paragraph",
          text: "Para que el formulario funcione usamos proveedores que procesan datos en nuestro nombre:",
        },
        {
          kind: "table",
          head: ["Proveedor", "Para qué"],
          rows: [
            ["Supabase", "Guardar tu solicitud en una base de datos privada"],
            ["Vercel", "Alojar el sitio web"],
          ],
        },
        {
          kind: "paragraph",
          text: "Estos servicios pueden tener servidores fuera del Perú, por lo que tus datos podrían procesarse en otro país, como Estados Unidos",
        },
      ],
    },
    {
      id: "acceso",
      title: "6. Quién puede verlos",
      blocks: [
        {
          kind: "paragraph",
          text: "Tus datos no son públicos. Solo las personas del equipo que tienen acceso al panel de la base de datos pueden leerlos, y las usamos únicamente para el fin descrito en el punto 3.",
        },
      ],
    },
    {
      id: "conservacion",
      title: "7. Cuánto tiempo los guardamos",
      blocks: [
        {
          kind: "paragraph",
          text: "Mientras sean necesarios para atender tu solicitud, o hasta que nos pidas borrarlos.",
        },
      ],
    },
    {
      id: "derechos",
      title: "8. Tus derechos",
      blocks: [
        { kind: "paragraph", text: "Puedes pedirnos, en cualquier momento:" },
        {
          kind: "list",
          items: [
            "**Saber** qué datos tuyos tenemos.",
            "**Corregirlos** si son inexactos.",
            "**Borrarlos**.",
            "**Oponerte** a que los sigamos usando, o **retirar tu consentimiento**.",
          ],
        },
        {
          kind: "paragraph",
          text: "Escríbenos a amd11dot4@gmail.com indicando el nombre y el teléfono (o el correo) con los que enviaste el formulario, para poder encontrar tu solicitud. Atendemos estos pedidos de forma manual y te respondemos en un plazo de 2 días.",
        },
      ],
    },
    {
      id: "cambios",
      title: "9. Cambios en esta política",
      blocks: [
        {
          kind: "paragraph",
          text: "Si cambiamos esta política, actualizaremos la fecha de arriba. Los cambios importantes se avisarán en esta misma página.",
        },
      ],
    },
  ],
};
