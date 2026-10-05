"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function PostsLoading() {
  const { dictionary: t } = useLocale();
  return <PageState body={t.posts.loading} />;
}
