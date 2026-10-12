import { Fragment } from "react";

// **bold** and bare email addresses are the only inline markup the policy uses.
const TOKEN = /(\*\*[^*]+\*\*|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/;
const EMAIL = /^[\w.+-]+@[\w-]+(?:\.[\w-]+)+$/;

export function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(TOKEN).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-bold text-[#241D14]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (EMAIL.test(part)) {
          return (
            <a
              key={index}
              href={`mailto:${part}`}
              className="font-bold text-[#C7431C] underline underline-offset-2 hover:no-underline"
            >
              {part}
            </a>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}
