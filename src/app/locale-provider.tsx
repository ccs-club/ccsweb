"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import { dictionaries, type Dictionary, type Locale } from "./i18n";

const STORAGE_KEY = "ccs-locale";
const LOCALE_CHANGE_EVENT = "ccs-locale-change";
const DEFAULT_LOCALE: Locale = "en";

let clientLocale: Locale | undefined;

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;

  const urlLocale = new URLSearchParams(window.location.search).get("lang");
  if (urlLocale !== null) return urlLocale === "mn" ? "mn" : "en";
  if (clientLocale) return clientLocale;

  try {
    return window.localStorage.getItem(STORAGE_KEY) === "mn" ? "mn" : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(onStoreChange: () => void): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      clientLocale = undefined;
      onStoreChange();
    }
  };
  const handleLocaleChange = () => onStoreChange();

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  };
}

function getServerLocale(): Locale {
  return DEFAULT_LOCALE;
}

const LocaleContext = createContext<{
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
}>({
  locale: DEFAULT_LOCALE,
  dictionary: dictionaries[DEFAULT_LOCALE],
  setLocale: () => {},
});

export function useLocale() {
  return useContext(LocaleContext);
}

export function localizedHref(href: string, locale: Locale): string {
  if (locale === "en") return href;
  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);
  return `${path}${path.includes("?") ? "&" : "?"}lang=mn${hash}`;
}

function updateMeta(attribute: "name" | "property", key: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (element) element.content = content;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // The server snapshot is always English, so the first client render hydrates
  // safely. useSyncExternalStore then applies a saved locale after hydration.
  const locale = useSyncExternalStore(
    subscribe,
    readStoredLocale,
    getServerLocale,
  );
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.lang = locale;
    const dictionary = dictionaries[locale];
    const title =
      pathname === "/events"
        ? `${dictionary.events.title} | CCS Club`
        : pathname === "/admin"
          ? `${dictionary.admin.title} | CCS Club`
          : dictionary.meta.title;
    const description =
      pathname === "/events"
        ? dictionary.events.intro
        : pathname === "/admin"
          ? dictionary.admin.subtitle
          : dictionary.meta.description;
    document.title = title;
    const url = new URL(window.location.href);
    if (locale === "mn" && url.searchParams.get("lang") !== "mn") {
      url.searchParams.set("lang", "mn");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    updateMeta("name", "description", description);
    updateMeta("property", "og:title", title);
    updateMeta("property", "og:description", description);
    updateMeta("property", "og:locale", locale === "mn" ? "mn_MN" : "en_US");
    updateMeta("property", "og:url", `${url.origin}${url.pathname}${url.search}`);
    updateMeta("name", "twitter:title", title);
    updateMeta("name", "twitter:description", description);
    const titleUpdate = window.setTimeout(() => {
      document.title = title;
    }, 50);

    return () => window.clearTimeout(titleUpdate);
  }, [locale, pathname]);

  const setLocale = (next: Locale) => {
    clientLocale = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The in-memory value still keeps the current tab usable when storage is
      // blocked (for example, in a restricted private browsing context).
    }
    document.documentElement.lang = next;
    const url = new URL(window.location.href);
    if (next === "mn") url.searchParams.set("lang", "mn");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  };

  return (
    <LocaleContext.Provider
      value={{ locale, dictionary: dictionaries[locale], setLocale }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
