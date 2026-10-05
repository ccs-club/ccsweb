import HomeClient from "./home-client";
import { localizedMetadata, localeFromSearchParams } from "./page-metadata";
import { LocaleProvider } from "./locale-provider";

export async function generateMetadata({ searchParams }: PageProps<"/">) {
  return localizedMetadata("home", localeFromSearchParams(await searchParams));
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const locale = localeFromSearchParams(await searchParams);
  return (
    <LocaleProvider initialLocale={locale}>
      <HomeClient />
    </LocaleProvider>
  );
}
