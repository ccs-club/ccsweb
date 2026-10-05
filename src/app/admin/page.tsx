import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import { UnsavedChangesProvider } from "@/app/unsaved-changes";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { isFacebookConfigured } from "@/lib/facebook";
import { getSelectedFacebookPosts } from "@/lib/facebook-posts";
import { getEvents } from "@/lib/events";
import AdminClient from "./admin-client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: PageProps<"/admin">) {
  return localizedMetadata("admin", localeFromSearchParams(await searchParams));
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const locale = localeFromSearchParams(await searchParams);
  const configured = isAdminConfigured();
  const authenticated = configured && (await isAdmin());
  const [events, facebookPosts] = authenticated
    ? await Promise.all([getEvents(), getSelectedFacebookPosts()])
    : [[], []];
  const facebookConfigured = isFacebookConfigured();

  return (
    <LocaleProvider initialLocale={locale}>
      <UnsavedChangesProvider>
        <div className="site-shell">
          <SiteHeader />
          <main id="main-content" className="admin-page section-wrap">
            <AdminClient
              initialEvents={events}
              initialFacebookPosts={facebookPosts}
              initialAuthenticated={authenticated}
              configured={configured}
              facebookConfigured={facebookConfigured}
            />
          </main>
        </div>
      </UnsavedChangesProvider>
    </LocaleProvider>
  );
}
