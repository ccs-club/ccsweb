"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function AdminLoading() {
  const { dictionary: t } = useLocale();
  return <PageState body={t.admin.loading} />;
}
