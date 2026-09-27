"use client";

import SiteHeader from "@/app/site-header";
import { useLocale } from "@/app/locale-provider";

export default function EventsLoading() {
  const { dictionary: t } = useLocale();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="events-state section-wrap" aria-live="polite">
        <p>{t.events.loading}</p>
      </main>
    </div>
  );
}
