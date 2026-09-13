import { describe, expect, it } from "vitest";

import { orderOptions } from "@/lib/game/options";
import type { Item } from "@/lib/game/types";

function item(id: string): Item {
  return {
    id,
    tokens: ["Nokoi", null, "kipatsiki"],
    answer: "kaniri",
    distractors: ["shima", "inchato"],
    prompt: "Quiero yuca en la tierra",
    answerTranslation: "yuca",
    sourceId: "test-source",
  };
}

describe("orderOptions", () => {
  it("offers the answer and both distractors, once each", () => {
    const options = orderOptions(item("a:0"), 1);

    expect([...options].sort()).toEqual(["inchato", "kaniri", "shima"]);
  });

  it("is deterministic for the same item and seed", () => {
    expect(orderOptions(item("a:0"), 7)).toEqual(orderOptions(item("a:0"), 7));
  });

  // AC-G2-10 — if the answer always landed in the same slot, a learner could
  // score the whole lesson without reading a single word.
  it("does not always put the answer in the same position", () => {
    const positions = new Set(
      ["a:0", "b:1", "c:0", "d:2", "e:0", "f:1", "g:0", "h:3"].map((id) =>
        orderOptions(item(id), 1).indexOf("kaniri"),
      ),
    );

    expect(positions.size).toBeGreaterThan(1);
  });

  it("moves the answer when the seed changes", () => {
    const positions = new Set(
      [1, 2, 3, 4, 5, 6].map((seed) =>
        orderOptions(item("a:0"), seed).indexOf("kaniri"),
      ),
    );

    expect(positions.size).toBeGreaterThan(1);
  });

  it("puts the answer in every slot across enough items", () => {
    const positions = new Set(
      Array.from({ length: 60 }, (_, index) =>
        orderOptions(item(`entry-${index}:0`), 1).indexOf("kaniri"),
      ),
    );

    expect([...positions].sort()).toEqual([0, 1, 2]);
  });
});
