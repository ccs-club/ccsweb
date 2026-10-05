import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import AboutView from "./about-view";

export async function generateMetadata({ searchParams }: PageProps<"/about">) {
  return localizedMetadata("about", localeFromSearchParams(await searchParams));
}

export default async function AboutPage({ searchParams }: PageProps<"/about">) {
  const locale = localeFromSearchParams(await searchParams);
  return (
    <LocaleProvider initialLocale={locale}>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content">
          <AboutView />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
