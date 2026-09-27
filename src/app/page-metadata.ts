import type { Metadata } from "next";
import { dictionaries, type Locale } from "./i18n";

export function localeFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): Locale {
  const lang = searchParams.lang;
  return (Array.isArray(lang) ? lang[0] : lang) === "mn" ? "mn" : "en";
}

export function localizedMetadata(
  page: "home" | "events" | "admin",
  locale: Locale,
): Metadata {
  const dictionary = dictionaries[locale];
  const title =
    page === "events"
      ? `${dictionary.events.title} | CCS Club`
      : page === "admin"
        ? `${dictionary.admin.title} | CCS Club`
        : dictionary.meta.title;
  const description =
    page === "events"
      ? dictionary.events.intro
      : page === "admin"
        ? dictionary.admin.subtitle
        : dictionary.meta.description;
  const path = page === "home" ? "/" : `/${page}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "CCS Club",
      title,
      description,
      locale: locale === "mn" ? "mn_MN" : "en_US",
      url: `${path}${locale === "mn" ? "?lang=mn" : ""}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    ...(page === "admin" ? { robots: { index: false, follow: false } } : {}),
  };
}
