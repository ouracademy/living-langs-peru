import { useState } from "react";

import {
  unverifyEntries,
  verificationTargets,
  verifyEntries,
} from "@/lib/language-bundles/edit-bundle";
import type { LanguageBundle } from "@/lib/language-bundles/types";

import {
  dangerButton,
  primaryButton,
  secondaryButton,
} from "../bundle-admin/styles";
import { TextField } from "./fields";
import type { EditorChange } from "./types";

type BulkVerifyProps = {
  bundle: LanguageBundle;
  /** The words of the filtered list, in order. */
  visibleIds: string[];
  /** The chosen ones among them; empty means «the whole list». */
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onChange: EditorChange;
};

type Mode = "idle" | "verify" | "unverify";

function SelectionButtons({
  visibleIds,
  selectedIds,
  onSelect,
}: Pick<BulkVerifyProps, "visibleIds" | "selectedIds" | "onSelect">) {
  const allSelected =
    visibleIds.length > 0 && selectedIds.length === visibleIds.length;
  return (
    <div className="flex flex-wrap gap-3">
      {allSelected ? null : (
        <button
          type="button"
          onClick={() => onSelect(visibleIds)}
          className={secondaryButton}
        >
          Seleccionar las {visibleIds.length} de esta lista
        </button>
      )}
      {selectedIds.length > 0 ? (
        <button
          type="button"
          onClick={() => onSelect([])}
          className={secondaryButton}
        >
          Quitar la selección ({selectedIds.length})
        </button>
      ) : null}
    </div>
  );
}

/** Verifying is a decision: it asks who checked, then asks to confirm. */
function VerifyConfirm({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: (by: string) => void;
  onCancel: () => void;
}) {
  const [by, setBy] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
      <TextField
        label="Quién o qué las verificó"
        hint="Una persona hablante o la fuente oficial."
        value={by}
        onChange={setBy}
      />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!by.trim()}
          onClick={() => onConfirm(by)}
          className={primaryButton}
        >
          Sí, marcar {count} como verificadas
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function UnverifyConfirm({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white p-4">
      <p className="text-sm">
        Dejarán de aparecer en el diccionario y en los juegos cuando publiques.
        Se olvida quién las verificó.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          autoFocus
          onClick={onConfirm}
          className={dangerButton}
        >
          Sí, quitar la verificación a {count}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

/**
 * «Marcar como verificadas» and «Quitar la verificación» for the chosen
 * words, or for the whole filtered list when none is chosen.
 */
export function BulkVerify({
  bundle,
  visibleIds,
  selectedIds,
  onSelect,
  onChange,
}: BulkVerifyProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const scope = selectedIds.length > 0 ? selectedIds : visibleIds;
  const where = selectedIds.length > 0 ? "la selección" : "esta lista";
  const { toVerify, toUnverify } = verificationTargets(bundle, scope);

  const finish = (next: LanguageBundle, message: string) => {
    onChange(next, message);
    onSelect([]);
    setMode("idle");
  };

  if (mode === "verify") {
    return (
      <VerifyConfirm
        count={toVerify.length}
        onConfirm={(by) =>
          finish(
            verifyEntries(bundle, toVerify, by),
            `${toVerify.length} palabras marcadas como verificadas.`,
          )
        }
        onCancel={() => setMode("idle")}
      />
    );
  }
  if (mode === "unverify") {
    return (
      <UnverifyConfirm
        count={toUnverify.length}
        onConfirm={() =>
          finish(
            unverifyEntries(bundle, toUnverify),
            `${toUnverify.length} palabras ya no están verificadas.`,
          )
        }
        onCancel={() => setMode("idle")}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <SelectionButtons
        visibleIds={visibleIds}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />
      <div className="flex flex-wrap gap-3">
        {toVerify.length > 0 ? (
          <button
            type="button"
            onClick={() => setMode("verify")}
            className={secondaryButton}
          >
            Marcar las {toVerify.length} sin verificar de {where} como
            verificadas
          </button>
        ) : null}
        {toUnverify.length > 0 ? (
          <button
            type="button"
            onClick={() => setMode("unverify")}
            className={secondaryButton}
          >
            Quitar la verificación a las {toUnverify.length} verificadas de{" "}
            {where}
          </button>
        ) : null}
      </div>
    </div>
  );
}
