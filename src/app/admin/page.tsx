import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { UnsavedChangesProvider } from "@/app/unsaved-changes";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { getEvents } from "@/lib/events";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: PageProps<"/admin">) {
  return localizedMetadata("admin", localeFromSearchParams(await searchParams));
}

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const authenticated = configured && (await isAdmin());
  const events = authenticated ? await getEvents() : [];

  return (
    <UnsavedChangesProvider>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content" className="admin-page section-wrap">
          <AdminClient
            initialEvents={events}
            initialAuthenticated={authenticated}
            configured={configured}
          />
        </main>
      </div>
    </UnsavedChangesProvider>
  );
}
