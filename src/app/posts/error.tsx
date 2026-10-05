"use client";

import PageState from "@/app/page-state";
import { useLocale } from "@/app/locale-provider";

export default function PostsError({ retry }: { retry: () => void }) {
  const { dictionary: t } = useLocale();
  return (
    <PageState
      role="alert"
      title={t.posts.errorTitle}
      body={t.posts.errorBody}
      action={t.posts.tryAgain}
      onAction={retry}
    />
  );
}
