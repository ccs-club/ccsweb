"use client";

import SiteHeader from "@/app/site-header";

/* Shared shell for route error and loading boundaries: header, one heading,
   one line of copy, one optional action. */
export default function PageState({
  title,
  body,
  action,
  onAction,
  role = "status",
}: {
  title?: string;
  body: string;
  action?: string;
  onAction?: () => void;
  role?: "status" | "alert";
}) {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content" className="events-state section-wrap" role={role}>
        {title ? <h1>{title}</h1> : null}
        <p>{body}</p>
        {action ? (
          <button className="button button-primary" type="button" onClick={onAction}>
            {action}
          </button>
        ) : null}
      </main>
    </div>
  );
}
