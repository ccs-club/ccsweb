import type { Metadata } from "next";
import { dictionaries, type Dictionary, type Locale } from "./i18n";

export function localeFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): Locale {
  const lang = searchParams.lang;
  return (Array.isArray(lang) ? lang[0] : lang) === "mn" ? "mn" : "en";
}

export type PageName = "home" | "about" | "gallery" | "events" | "posts" | "admin";

/* One mapping, used by the server metadata and the client <title> effect. */
export function pageTitle(page: PageName, dictionary: Dictionary): string {
  const heading =
    page === "events"
      ? dictionary.events.title
      : page === "posts"
        ? dictionary.posts.title
      : page === "gallery"
        ? dictionary.galleryPage.title
        : page === "about"
          ? dictionary.about.pageTitle
          : page === "admin"
            ? dictionary.admin.title
            : dictionary.meta.title;
  return page === "home" ? heading : `${heading} | CCS Club`;
}

export function pageDescription(
  page: PageName,
  dictionary: Dictionary,
): string {
  return page === "events"
    ? dictionary.events.intro
    : page === "posts"
      ? dictionary.posts.intro
    : page === "gallery"
      ? dictionary.galleryPage.intro
      : page === "about"
        ? dictionary.about.pageIntro
        : page === "admin"
          ? dictionary.admin.subtitle
          : dictionary.meta.description;
}

export function localizedMetadata(page: PageName, locale: Locale): Metadata {
  const dictionary = dictionaries[locale];
  const title = pageTitle(page, dictionary);
  const description = pageDescription(page, dictionary);
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
