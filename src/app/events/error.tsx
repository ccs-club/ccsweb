"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function EventsError({ retry }: { retry: () => void }) {
  const { dictionary: t } = useLocale();
  return (
    <PageState
      role="alert"
      title={t.events.errorTitle}
      body={t.events.errorBody}
      action={t.events.tryAgain}
      onAction={retry}
    />
  );
}
