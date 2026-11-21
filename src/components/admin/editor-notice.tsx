"use client";

import type { Ref } from "react";

import { type SaveFailure, SaveFailureNotice } from "./gallery-notice";
import { PublishNotice } from "./publish-notice";

export type Notice =
  | { kind: "none" }
  | { kind: "saved"; id: number; message: string }
  | { kind: "failed"; failure: SaveFailure };

type EditorNoticeProps = {
  notice: Notice;
  ref?: Ref<HTMLDivElement>;
  onReload: () => void;
};

const KEPT = {
  conflict: "No se perdió nada:",
  offline: "No se guardó el cambio.",
};

/** The one message above the list: what was saved, or why not. */
export function EditorNotice({ notice, ref, onReload }: EditorNoticeProps) {
  if (notice.kind === "saved") {
    return <PublishNotice key={notice.id} ref={ref} message={notice.message} />;
  }

  return (
    <div ref={ref} tabIndex={-1} className="mt-6 outline-none">
      {notice.kind === "failed" ? (
        <SaveFailureNotice
          failure={notice.failure}
          kept={KEPT}
          onReload={onReload}
        />
      ) : null}
    </div>
  );
}
