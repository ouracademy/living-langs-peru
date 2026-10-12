import { InlineText } from "@/components/privacy/inline-text";
import type { PolicyBlock as Block } from "@/lib/privacy/policy";

export function PolicyBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-lg leading-relaxed text-[#4A4130]">
          <InlineText text={block.text} />
        </p>
      );
    case "list":
      return (
        <ul className="ml-6 flex list-disc flex-col gap-2 text-lg leading-relaxed text-[#4A4130]">
          {block.items.map((item) => (
            <li key={item}>
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-base text-[#4A4130]">
            <thead>
              <tr className="border-b-2 border-[#241D14]/20">
                {block.head.map((cell) => (
                  <th
                    key={cell}
                    scope="col"
                    className="py-2 pr-6 font-bold text-[#241D14]"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]} className="border-b border-[#241D14]/10">
                  {row.map((cell) => (
                    <td key={cell} className="py-2 pr-6 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}
