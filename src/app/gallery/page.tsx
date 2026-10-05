import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import GalleryView from "./gallery-view";

export async function generateMetadata({ searchParams }: PageProps<"/gallery">) {
  return localizedMetadata("gallery", localeFromSearchParams(await searchParams));
}

export default async function GalleryPage({ searchParams }: PageProps<"/gallery">) {
  const locale = localeFromSearchParams(await searchParams);
  return (
    <LocaleProvider initialLocale={locale}>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content">
          <GalleryView />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
