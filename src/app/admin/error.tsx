"use client";

import SiteHeader from "@/app/site-header";
import { useLocale } from "@/app/locale-provider";

export default function AdminError({ reset }: { reset: () => void }) {
  const { dictionary: t } = useLocale();
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="events-state section-wrap" role="alert">
        <h1>{t.admin.errorTitle}</h1>
        <p>{t.admin.errorBody}</p>
        <button className="button button-primary" type="button" onClick={reset}>
          {t.admin.tryAgain}
        </button>
      </main>
    </div>
  );
}
