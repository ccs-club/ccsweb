"use client";

import { useLocale } from "./locale-provider";

export default function LocaleToggle() {
  const { dictionary: t, locale, setLocale } = useLocale();

  return (
    <div className="locale-toggle" role="group" aria-label={t.nav.language}>
      <button
        type="button"
        className={locale === "en" ? "is-active" : ""}
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === "mn" ? "is-active" : ""}
        onClick={() => setLocale("mn")}
        aria-pressed={locale === "mn"}
      >
        MN
      </button>
    </div>
  );
}
