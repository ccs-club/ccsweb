"use client";

import SiteHeader from "@/app/site-header";
import { useLocale } from "@/app/locale-provider";

export default function EventsError({ reset }: { reset: () => void }) {
  const { dictionary: t } = useLocale();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="events-state section-wrap" role="alert">
        <h1>{t.events.errorTitle}</h1>
        <p>{t.events.errorBody}</p>
        <button className="button button-primary" type="button" onClick={reset}>
          {t.events.tryAgain}
        </button>
      </main>
    </div>
  );
}
