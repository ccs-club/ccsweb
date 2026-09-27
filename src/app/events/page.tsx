import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { getEvents } from "@/lib/events";
import EventsView from "./events-view";

export async function generateMetadata({ searchParams }: PageProps<"/events">) {
  return localizedMetadata("events", localeFromSearchParams(await searchParams));
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="site-shell">
      <SiteHeader />
      <main id="main-content">
        <EventsView events={events} />
      </main>
      <SiteFooter />
    </div>
  );
}
