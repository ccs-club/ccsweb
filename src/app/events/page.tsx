import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import { getEvents } from "@/lib/events";
import EventsView from "./events-view";

export async function generateMetadata({ searchParams }: PageProps<"/events">) {
  return localizedMetadata("events", localeFromSearchParams(await searchParams));
}

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const [events, params] = await Promise.all([getEvents(), searchParams]);
  const locale = localeFromSearchParams(params);

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content">
          <EventsView events={events} />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
