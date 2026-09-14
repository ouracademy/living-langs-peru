import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WordGame } from "@/components/game/word-game";
import type { Source } from "@/lib/dictionary";
import { resetStore } from "@/lib/game/progress-store";
import type { Item } from "@/lib/game/types";

const realStorage = Object.getOwnPropertyDescriptor(window, "localStorage");

afterEach(() => {
  cleanup();
  // A test may have replaced the store with one that throws on everything,
  // including clear(), so put the real one back before touching it.
  if (realStorage) Object.defineProperty(window, "localStorage", realStorage);
  localStorage.clear();
  resetStore();
});

const sources: Source[] = [
  {
    id: "test-source",
    title: "Fuente de prueba",
    publisher: "Editor",
    year: 2026,
    url: "https://example.org",
  },
];

function item(index: number): Item {
  return {
    id: `e${index}:0`,
    tokens: ["Nokoi", null, "kipatsiki"],
    answer: `word-${index}`,
    distractors: [`otra-${index}`, `tercera-${index}`],
    prompt: `Quiero la cosa ${index}`,
    answerTranslation: `cosa ${index}`,
    sourceId: "test-source",
  };
}

function pool(size: number): Item[] {
  return Array.from({ length: size }, (_, index) => item(index));
}

function play(items: Item[]) {
  return render(
    <WordGame
      items={items}
      language="ashaninka"
      languageCode="cni"
      sources={sources}
    />,
  );
}

function start(items: Item[]) {
  play(items);
  fireEvent.click(screen.getByRole("button", { name: "Empezar lección" }));
}

/** The tile for a word, found the way a player would: by its label. */
function tile(word: string) {
  return screen.getByRole("button", { name: new RegExp(`\\b${word}$`) });
}

/** Which item is on screen, worked out from the prompt. */
function shownItem(items: Item[]): Item {
  const prompt = screen.getByTestId("prompt").textContent ?? "";
  const found = items.find((candidate) => prompt.includes(candidate.prompt));

  if (!found) throw new Error(`Ningún ítem con el enunciado: ${prompt}`);

  return found;
}

function answerCorrectly(items: Item[]) {
  fireEvent.click(tile(shownItem(items).answer));
}

function answerWrongly(items: Item[]) {
  fireEvent.click(tile(shownItem(items).distractors[0]));
}

function goOn() {
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
}

describe("the start screen", () => {
  it("says how long the lesson is and does not start on its own", () => {
    play(pool(4));

    expect(screen.getByText(/4 preguntas y tienes tres vidas/)).toBeTruthy();
    expect(screen.queryByTestId("prompt")).toBeNull();
  });

  it("caps the stated length at a lesson", () => {
    play(pool(40));

    expect(screen.getByText(/10 preguntas/)).toBeTruthy();
  });

  it("shows nothing about past lessons the first time", () => {
    play(pool(4));

    expect(screen.queryByText(/Completaste/)).toBeNull();
  });
});

describe("answering", () => {
  it("shows the prompt, a gap and three tiles", () => {
    const items = pool(3);
    start(items);

    expect(screen.getByTestId("prompt")).toBeTruthy();
    expect(screen.getByText("espacio en blanco")).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: /word-|otra-|tercera-/ }),
    ).toHaveLength(3);
  });

  it("marks the Asháninka sentence with its own language", () => {
    const items = pool(3);
    start(items);

    const sentence = screen.getByText(/Nokoi/);

    expect(sentence.closest("[lang]")?.getAttribute("lang")).toBe("cni");
  });

  it("says Correcto in words, not only in colour, and cites the source", () => {
    const items = pool(3);
    start(items);
    answerCorrectly(items);

    const feedback = screen.getByRole("status");

    expect(feedback.textContent).toContain("Correcto");
    expect(feedback.textContent).toContain("Fuente de prueba");
  });

  it("moves focus to the way forward after answering", () => {
    const items = pool(3);
    start(items);
    answerCorrectly(items);

    expect(document.activeElement?.textContent).toBe("Continuar");
  });

  it("reveals the right word when the answer was wrong", () => {
    const items = pool(3);
    start(items);
    const expected = shownItem(items).answer;
    answerWrongly(items);

    const feedback = screen.getByRole("status");

    expect(feedback.textContent).toContain("Incorrecto");
    expect(feedback.textContent).toContain(expected);
  });

  it("spends a life on a mistake and leaves the bar alone", () => {
    const items = pool(3);
    start(items);
    answerWrongly(items);
    goOn();

    expect(screen.getByText("Vidas: 2 de 3")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "0 de 3",
    );
  });

  it("advances the bar on a correct answer", () => {
    const items = pool(3);
    start(items);
    answerCorrectly(items);
    goOn();

    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "1 de 3",
    );
  });

  it("answers to the number keys", () => {
    const items = pool(3);
    start(items);
    fireEvent.keyDown(window, { key: "1" });

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("ignores a key that is not a tile", () => {
    const items = pool(3);
    start(items);
    fireEvent.keyDown(window, { key: "9" });
    fireEvent.keyDown(window, { key: "a" });

    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("finishing", () => {
  it("summarises a lesson answered right, and remembers it", () => {
    const items = pool(3);
    start(items);

    for (let asked = 0; asked < 3; asked++) {
      answerCorrectly(items);
      goOn();
    }

    expect(screen.getByText("Lección completada")).toBeTruthy();
    expect(screen.getByText(/Acertaste 3 de 3/)).toBeTruthy();

    cleanup();
    play(items);

    expect(screen.getByText("Completaste 1 lección")).toBeTruthy();
  });

  it("ends after three mistakes and lists the words to review", () => {
    const items = pool(6);
    start(items);

    for (let mistake = 0; mistake < 3; mistake++) {
      answerWrongly(items);
      goOn();
    }

    expect(screen.getByText("Se acabaron las vidas")).toBeTruthy();
    expect(screen.getByText("Palabras para repasar")).toBeTruthy();
    expect(
      screen.getAllByRole("link", { name: "ver en el diccionario" }).length,
    ).toBe(3);
  });

  it("links a reviewed word to its dictionary entry", () => {
    const items = pool(6);
    start(items);
    const missed = shownItem(items);
    answerWrongly(items);
    goOn();
    answerWrongly(items);
    goOn();
    answerWrongly(items);
    goOn();

    const link = screen.getAllByRole("link", {
      name: "ver en el diccionario",
    })[0];

    expect(link.getAttribute("href")).toBe(
      `/diccionario/ashaninka?palabra=${missed.id.split(":")[0]}`,
    );
  });

  it("banks the right answers even when the lesson is lost", () => {
    const items = pool(6);
    start(items);
    answerCorrectly(items);
    goOn();

    for (let mistake = 0; mistake < 3; mistake++) {
      answerWrongly(items);
      goOn();
    }

    cleanup();
    play(items);

    // The lesson was lost, but the one right answer still counts.
    expect(screen.getByText("Completaste 1 lección")).toBeTruthy();
  });

  it("starts a fresh lesson from the summary", () => {
    const items = pool(3);
    start(items);

    for (let asked = 0; asked < 3; asked++) {
      answerCorrectly(items);
      goOn();
    }

    fireEvent.click(screen.getByRole("button", { name: "Otra lección" }));

    expect(screen.getByTestId("prompt")).toBeTruthy();
  });
});

describe("when the browser will not store anything", () => {
  function blockStorage() {
    const deny = () => {
      throw new DOMException("denied", "SecurityError");
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: deny,
        setItem: deny,
        removeItem: deny,
        clear: deny,
        key: deny,
        length: 0,
      },
    });
  }

  it("says so once, and stays playable to the end", () => {
    blockStorage();
    const items = pool(3);

    play(items);

    expect(screen.getByText(/no nos deja guardar el progreso/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Empezar lección" }));

    for (let asked = 0; asked < 3; asked++) {
      answerCorrectly(items);
      goOn();
    }

    expect(screen.getByText("Lección completada")).toBeTruthy();
  });
});
