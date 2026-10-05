"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function EventsLoading() {
  const { dictionary: t } = useLocale();
  return <PageState body={t.events.loading} />;
}
