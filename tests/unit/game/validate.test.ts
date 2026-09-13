import { describe, expect, it } from "vitest";

import { MIN_POOL_SIZE } from "@/lib/game/constants";
import { buildItems } from "@/lib/game/items";
import { getDictionary } from "@/lib/dictionary";
import { describePool, validatePool } from "@/lib/game/validate";
import type { Item } from "@/lib/game/types";

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "kaniri:0",
    tokens: ["Nokoi", null, "kipatsiki"],
    answer: "kaniri",
    distractors: ["shima", "inchato"],
    prompt: "Quiero yuca en la tierra",
    answerTranslation: "yuca",
    sourceId: "test-source",
    ...overrides,
  };
}

/** A pool big enough that only the seeded problem is reported. */
function pool(overrides: Partial<Item> = {}): Item[] {
  return [
    item(overrides),
    ...Array.from({ length: MIN_POOL_SIZE }, (_, index) =>
      item({ id: `filler-${index}:0` }),
    ),
  ];
}

describe("validatePool", () => {
  // AC-G1-11 — the real pool must pass.
  it("passes the shipped Asháninka pool", () => {
    const items = buildItems(getDictionary("ashaninka")!.entries);

    expect(validatePool(items, "ashaninka")).toEqual([]);
  });

  // AC-G1-11 — and a too-small pool must fail.
  it("fails a pool of three items", () => {
    const problems = validatePool([item(), item({ id: "b:0" })], "ashaninka");

    expect(problems.join(" ")).toMatch(/mínimo es 100/);
  });

  it("catches an item with no gap", () => {
    const problems = validatePool(
      pool({ tokens: ["Nokoi", "kipatsiki"] }),
      "x",
    );

    expect(problems.join(" ")).toMatch(/0 huecos/);
  });

  it("catches an item with two gaps", () => {
    const problems = validatePool(pool({ tokens: [null, "jeri", null] }), "x");

    expect(problems.join(" ")).toMatch(/2 huecos/);
  });

  it("catches a distractor that is the answer", () => {
    const problems = validatePool(
      pool({ distractors: ["kaniri", "shima"] }),
      "x",
    );

    expect(problems.join(" ")).toMatch(/un distractor es la respuesta/);
  });

  it("catches repeated distractors", () => {
    const problems = validatePool(
      pool({ distractors: ["shima", "shima"] }),
      "x",
    );

    expect(problems.join(" ")).toMatch(/distractores repetidos/);
  });

  it("catches a missing source", () => {
    const problems = validatePool(pool({ sourceId: "" }), "x");

    expect(problems.join(" ")).toMatch(/sin sourceId/);
  });

  it("catches an empty answer or prompt", () => {
    expect(validatePool(pool({ answer: " " }), "x").join(" ")).toMatch(
      /respuesta vacía/,
    );
    expect(validatePool(pool({ prompt: "" }), "x").join(" ")).toMatch(
      /enunciado vacío/,
    );
  });

  it("catches a repeated id", () => {
    const problems = validatePool([...pool(), item()], "x");

    expect(problems.join(" ")).toMatch(/id repetido/);
  });
});

describe("describePool", () => {
  // This dump is what a speaker reads to judge whether a distractor could
  // also be valid in the gap, so it has to show all three options.
  it("shows the sentence, the gloss and the distractors", () => {
    const dump = describePool([item()]);

    expect(dump).toContain("Nokoi «kaniri» kipatsiki");
    expect(dump).toContain("Quiero yuca en la tierra");
    expect(dump).toContain("shima · inchato");
    expect(dump).toContain("test-source");
  });
});
