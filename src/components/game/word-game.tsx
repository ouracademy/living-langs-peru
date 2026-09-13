"use client";

import { useCallback, useEffect, useState } from "react";

import type { Source } from "@/lib/dictionary";
import { LESSON_SIZE } from "@/lib/game/constants";
import {
  type LessonState,
  answer,
  buildLesson,
  createLesson,
  next,
} from "@/lib/game/lesson";
import { toSentenceText } from "@/lib/game/sentence";
import type { Item } from "@/lib/game/types";

import { FeedbackPanel } from "./feedback-panel";
import { Hearts } from "./hearts";
import { LessonProgress } from "./lesson-progress";
import { LessonStart } from "./lesson-start";
import { LessonSummary } from "./lesson-summary";
import { LessonView } from "./lesson-view";
import { useProgress } from "./use-progress";

type WordGameProps = {
  /** The whole pool. Which items a lesson uses is decided here, on the client. */
  items: Item[];
  language: string;
  languageCode: string;
  sources: Source[];
};

/**
 * Owns the game state and switches between the three screens.
 *
 * The lesson is composed on the client and only when the player asks for it.
 * Shuffling during render would not match the prerendered HTML, and the saved
 * progress that decides which items come first exists only in the browser.
 */
export function WordGame({
  items,
  language,
  languageCode,
  sources,
}: WordGameProps) {
  const { storageAvailable, lessonsCompleted, masteredItemIds, saveLesson } =
    useProgress(language);
  const [lesson, setLesson] = useState<LessonState | null>(null);

  const start = useCallback(() => {
    setLesson(
      createLesson(buildLesson(items, masteredItemIds, Date.now()), Date.now()),
    );
  }, [items, masteredItemIds]);

  const finished =
    lesson !== null &&
    lesson.status !== "playing" &&
    lesson.answerState === null;

  const onSelect = useCallback(
    (word: string) => {
      if (lesson) setLesson(answer(lesson, word));
    },
    [lesson],
  );

  const onContinue = useCallback(() => {
    if (!lesson) return;

    const advanced = next(lesson);

    setLesson(advanced);

    // Saved here rather than in an effect: this is the moment the lesson
    // ends, and it happens once. One write per lesson instead of one per
    // answer, and nothing half-recorded if the tab closes mid-lesson. Only
    // the items answered correctly are banked, so a lost lesson still keeps
    // what the player got right.
    if (advanced.status !== "playing" && advanced.answerState === null) {
      saveLesson(advanced.answeredIds);
    }
  }, [lesson, saveLesson]);

  // Keyboard shortcuts for the tiles, the way a game is actually played.
  useEffect(() => {
    if (!lesson || lesson.answerState || lesson.status !== "playing") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const position = Number(event.key);

      if (!Number.isInteger(position)) return;

      const word = lesson.options[position - 1];

      if (word) onSelect(word);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lesson, onSelect]);

  if (!lesson) {
    return (
      <LessonStart
        lessonLength={Math.min(items.length, LESSON_SIZE)}
        lessonsCompleted={lessonsCompleted}
        storageAvailable={storageAvailable}
        onStart={start}
      />
    );
  }

  if (finished) {
    return (
      <LessonSummary
        answered={lesson.answered}
        total={lesson.total}
        hearts={lesson.hearts}
        missed={lesson.missed}
        failed={lesson.status === "failed"}
        languageCode={languageCode}
        language={language}
        onRestart={start}
      />
    );
  }

  const item = lesson.current!;

  return (
    <>
      <div className="mt-8 flex items-center gap-4">
        <LessonProgress answered={lesson.answered} total={lesson.total} />
        <Hearts left={lesson.hearts} />
      </div>

      <LessonView
        item={item}
        options={lesson.options}
        languageCode={languageCode}
        answered={lesson.answerState !== null}
        onSelect={onSelect}
      />

      {lesson.answerState && (
        <FeedbackPanel
          item={item}
          correct={lesson.answerState.correct}
          languageCode={languageCode}
          source={sources.find((source) => source.id === item.sourceId)}
          sentence={toSentenceText(item.tokens, item.answer)}
          onContinue={onContinue}
        />
      )}
    </>
  );
}
