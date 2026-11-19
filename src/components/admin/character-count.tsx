type CharacterCountProps = {
  id: string;
  length: number;
  min?: number;
  max: number;
};

/**
 * «42 / 300» under a text field (UI-5). Out of range it says so in words, not
 * only in color. Linked to its field through `aria-describedby`, not live: a
 * count announced on every keystroke would drown the screen reader.
 */
export function CharacterCount({ id, length, min, max }: CharacterCountProps) {
  let note = "";
  if (length > max) note = ` · sobran ${length - max}`;
  else if (min !== undefined && length > 0 && length < min) {
    note = ` · mínimo ${min}`;
  }

  return (
    <span
      id={id}
      className={`self-end text-xs ${note ? "font-bold text-[#C7431C]" : "text-[#4A4130]"}`}
    >
      {length} / {max}
      {note}
    </span>
  );
}
