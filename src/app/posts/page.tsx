import SiteFooter from "@/app/site-footer";
import SiteHeader from "@/app/site-header";
import { localizedMetadata, localeFromSearchParams } from "@/app/page-metadata";
import { LocaleProvider } from "@/app/locale-provider";
import { getPublishedFacebookPosts } from "@/lib/facebook";
import {
  getInformationFacebookPosts,
  syncSelectedFacebookPosts,
} from "@/lib/facebook-post-types";
import { getSelectedFacebookPosts } from "@/lib/facebook-posts";
import PostsView from "./posts-view";

export async function generateMetadata({ searchParams }: PageProps<"/posts">) {
  return localizedMetadata("posts", localeFromSearchParams(await searchParams));
}

export default async function PostsPage({ searchParams }: PageProps<"/posts">) {
  const [selectedPosts, params, recentPagePosts] = await Promise.all([
    getSelectedFacebookPosts(),
    searchParams,
    getPublishedFacebookPosts().catch(() => []),
  ]);
  const posts = syncSelectedFacebookPosts(selectedPosts, recentPagePosts);
  const informationPosts = getInformationFacebookPosts(posts, recentPagePosts);
  const locale = localeFromSearchParams(params);

  return (
    <LocaleProvider initialLocale={locale}>
      <div className="site-shell">
        <SiteHeader />
        <main id="main-content">
          <PostsView posts={posts} informationPosts={informationPosts} />
        </main>
        <SiteFooter />
      </div>
    </LocaleProvider>
  );
}
