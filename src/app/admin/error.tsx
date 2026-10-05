"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function AdminError({ retry }: { retry: () => void }) {
  const { dictionary: t } = useLocale();
  return (
    <PageState
      role="alert"
      title={t.admin.errorTitle}
      body={t.admin.errorBody}
      action={t.admin.tryAgain}
      onAction={retry}
    />
  );
}
