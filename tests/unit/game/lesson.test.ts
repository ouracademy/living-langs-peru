import { describe, expect, it } from "vitest";

import { HEARTS } from "@/lib/game/constants";
import { answer, createLesson, next } from "@/lib/game/lesson";
import type { Item } from "@/lib/game/types";

function item(id: string, answerWord = `answer-${id}`): Item {
  return {
    id,
    tokens: ["Nokoi", null, "kipatsiki"],
    answer: answerWord,
    distractors: ["shima", "inchato"],
    prompt: `prompt ${id}`,
    answerTranslation: "yuca",
    sourceId: "test-source",
  };
}

const three = [item("a:0"), item("b:0"), item("c:0")];

/** Answers the current item correctly and dismisses the feedback. */
function solve(state: ReturnType<typeof createLesson>) {
  return next(answer(state, state.current!.answer));
}

/** Answers the current item wrongly and dismisses the feedback. */
function fail(state: ReturnType<typeof createLesson>) {
  return next(answer(state, state.current!.distractors[0]));
}

describe("createLesson", () => {
  it("starts on the first item with full hearts", () => {
    const state = createLesson(three, 1);

    expect(state.current?.id).toBe("a:0");
    expect(state.hearts).toBe(HEARTS);
    expect(state.answered).toBe(0);
    expect(state.status).toBe("playing");
    expect(state.missed).toEqual([]);
  });

  // AC-G2-8 — the bar counts against the lesson, not against the pool.
  it("takes its total from the items it was given", () => {
    expect(createLesson(three, 1).total).toBe(3);
  });

  it("offers three options for the current item", () => {
    expect(createLesson(three, 1).options).toHaveLength(3);
  });

  it("completes immediately when given nothing to ask", () => {
    const state = createLesson([], 1);

    expect(state.status).toBe("completed");
    expect(state.current).toBeNull();
  });
});

describe("answering", () => {
  // AC-G2-1
  it("counts a correct answer and moves on", () => {
    const state = next(answer(createLesson(three, 1), "answer-a:0"));

    expect(state.answered).toBe(1);
    expect(state.current?.id).toBe("b:0");
    expect(state.hearts).toBe(HEARTS);
  });

  // AC-G2-2
  it("costs a heart on a wrong answer and does not advance the bar", () => {
    const state = answer(createLesson(three, 1), "shima");

    expect(state.hearts).toBe(HEARTS - 1);
    expect(state.answered).toBe(0);
  });

  // AC-G2-2 — the item comes back, at the end, so the lesson still teaches it.
  it("requeues a missed item behind the others", () => {
    const state = fail(createLesson(three, 1));

    expect(state.current?.id).toBe("b:0");
    expect(state.queue.map((queued) => queued.id)).toEqual(["c:0", "a:0"]);
  });

  it("reports what was chosen and whether it was right", () => {
    const wrong = answer(createLesson(three, 1), "shima");

    expect(wrong.answerState).toEqual({ selected: "shima", correct: false });

    const right = answer(createLesson(three, 1), "answer-a:0");

    expect(right.answerState).toEqual({
      selected: "answer-a:0",
      correct: true,
    });
  });

  // AC-G2-11
  it("ignores a second answer for the same item", () => {
    const once = answer(createLesson(three, 1), "shima");

    expect(answer(once, "answer-a:0")).toBe(once);
  });

  it("ignores an answer once the lesson is over", () => {
    let state = createLesson([item("a:0")], 1);
    state = answer(state, "answer-a:0");
    state = next(state);

    expect(state.status).toBe("completed");
    expect(answer(state, "answer-a:0")).toBe(state);
  });

  it("ignores a continue when there is no feedback showing", () => {
    const state = createLesson(three, 1);

    expect(next(state)).toBe(state);
  });

  // AC-G2-5
  it("records a missed item once, even when later answered right", () => {
    let state = fail(createLesson([item("a:0"), item("b:0")], 1));
    state = solve(state); // b:0
    state = solve(state); // a:0, on its second pass

    expect(state.answered).toBe(2);
    expect(state.missed.map((missed) => missed.id)).toEqual(["a:0"]);
  });
});

describe("ending the lesson", () => {
  // AC-G2-4
  it("completes when the last item is answered right", () => {
    let state = createLesson(three, 1);
    state = solve(state);
    state = solve(state);
    state = answer(state, state.current!.answer);

    expect(state.status).toBe("completed");
    expect(state.answered).toBe(3);
  });

  // AC-G2-3
  it("fails on the third mistake, without waiting for the queue to empty", () => {
    let state = createLesson(three, 1);
    state = fail(state);
    state = fail(state);
    state = answer(state, state.current!.distractors[0]);

    expect(state.hearts).toBe(0);
    expect(state.status).toBe("failed");
    expect(state.queue.length).toBeGreaterThan(0);
  });

  it("still shows the feedback for the answer that ended the lesson", () => {
    let state = createLesson(three, 1);
    state = fail(state);
    state = fail(state);
    state = answer(state, state.current!.distractors[0]);

    // Reading the right answer is the part that teaches; losing must not skip it.
    expect(state.answerState).not.toBeNull();
    expect(state.current).not.toBeNull();
  });

  // AC-G2-6 — each mistake costs a heart, so the requeue cannot loop forever.
  it("cannot take more than thirteen answers for a ten-item lesson", () => {
    const items = Array.from({ length: 10 }, (_, index) => item(`e${index}:0`));
    let state = createLesson(items, 1);
    let answers = 0;

    while (state.status === "playing" && answers < 100) {
      // Always wrong: the worst case for the queue.
      state = next(answer(state, state.current!.distractors[0]));
      answers++;
    }

    expect(answers).toBe(HEARTS);
    expect(state.status).toBe("failed");

    let best = createLesson(items, 1);
    answers = 0;

    while (best.status === "playing" && answers < 100) {
      best = next(answer(best, best.current!.answer));
      answers++;
    }

    expect(answers).toBe(10);
    expect(best.status).toBe("completed");
  });

  it("never lets the progress bar go backwards", () => {
    let state = createLesson(three, 1);
    const seen: number[] = [state.answered];

    state = solve(state);
    seen.push(state.answered);
    state = fail(state);
    seen.push(state.answered);
    state = solve(state);
    seen.push(state.answered);

    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });
});
