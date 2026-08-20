const LATIN_LETTER = /[A-Za-z]/;

export function needsArabicTranslation(note: string | null | undefined): boolean {
  return Boolean(note?.trim() && LATIN_LETTER.test(note));
}

export function getArabicOnlyVisitNote(
  sourceNote: string | null | undefined,
  translatedNote: string | null | undefined,
): string | null {
  const source = sourceNote?.trim();
  if (!source) return null;

  const translation = translatedNote?.trim();
  if (translation && !LATIN_LETTER.test(translation)) {
    return translation;
  }

  return needsArabicTranslation(source) ? "تم تسجيل ملاحظة للزيارة." : source;
}
