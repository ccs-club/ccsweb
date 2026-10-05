import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import { getSelectedFacebookPosts } from "@/lib/facebook-posts";
import PostsView from "./posts-view";

export async function generateMetadata({ searchParams }: PageProps<"/posts">) {
  return localizedMetadata("posts", localeFromSearchParams(await searchParams));
}

export default async function PostsPage({ searchParams }: PageProps<"/posts">) {
  const [posts, params] = await Promise.all([getSelectedFacebookPosts(), searchParams]);
  const locale = localeFromSearchParams(params);

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content">
          <PostsView posts={posts} />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
