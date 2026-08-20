import { useEffect, useMemo, useState } from "react";
import { needsArabicTranslation } from "../lib/visit-note-localization";
import { supabase } from "../lib/supabase";

interface VisitNoteInput {
  id: string;
  note: string | null | undefined;
}

interface TranslationResponse {
  translations?: Array<{ visitId: string; note: string }>;
}

export function useVisitNoteTranslations(visits: readonly VisitNoteInput[]) {
  const serializedTargets = JSON.stringify(
    visits
      .filter((visit) => needsArabicTranslation(visit.note))
      .map((visit) => ({ id: visit.id, note: visit.note }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  );
  const targets = useMemo(
    () => JSON.parse(serializedTargets) as Array<{ id: string; note: string }>,
    [serializedTargets],
  );
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    if (targets.length === 0) {
      setTranslations(new Map());
      return () => {
        cancelled = true;
      };
    }

    void supabase.functions
      .invoke<TranslationResponse>("translate-visit-notes", {
        body: { visitIds: targets.map((target) => target.id) },
      })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setTranslations(
          new Map(
            (data?.translations ?? []).map((translation) => [translation.visitId, translation.note]),
          ),
        );
      })
      .catch(() => {
        // Edge function unavailable or CORS error — fail silently
      });

    return () => {
      cancelled = true;
    };
  }, [targets]);

  return translations;
}
