"use client";

import { useMemo, useState } from "react";
import { ArrowIcon } from "@/app/icons";
import { useLocale } from "@/app/locale-provider";
import {
  normalizeFacebookPost,
  type FacebookPost,
} from "@/lib/facebook-post-types";

const MONTHS_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatPostDate(value: string, locale: "en" | "mn"): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  if (locale === "mn") return `${year} оны ${month + 1} дүгээр сарын ${day}`;
  return `${MONTHS_EN[month]} ${day}, ${year}`;
}

async function readResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function readPosts(value: unknown): FacebookPost[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map(normalizeFacebookPost)
    .filter((post): post is FacebookPost => post !== null);
}

function FacebookPostCard({
  post,
  action,
  actionLabel,
  actionClassName,
  actionDisabled,
  status,
  locale,
  imageOnly,
  openOnFacebook,
}: {
  post: FacebookPost;
  action?: () => void;
  actionLabel?: string;
  actionClassName?: string;
  actionDisabled?: boolean;
  status?: string;
  locale: "en" | "mn";
  imageOnly: string;
  openOnFacebook: string;
}) {
  const date = formatPostDate(post.createdTime, locale);

  return (
    <article className="admin-facebook-post">
      <time className="admin-facebook-date" dateTime={post.createdTime}>{date}</time>
      <p className="admin-facebook-message">{post.message || imageOnly}</p>
      <div className="admin-facebook-post-actions">
        <a href={post.permalinkUrl} target="_blank" rel="noreferrer">
          {openOnFacebook} <ArrowIcon />
        </a>
        {action && actionLabel ? (
          <button
            className={actionClassName || "button button-quiet"}
            type="button"
            onClick={action}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        ) : status ? <span className="admin-facebook-selected">{status}</span> : null}
      </div>
    </article>
  );
}

export default function FacebookPostManager({
  selectedPosts,
  initialConfigured,
  onSelectedPostsChange,
  onSessionExpired,
}: {
  selectedPosts: FacebookPost[];
  initialConfigured: boolean;
  onSelectedPostsChange: (posts: FacebookPost[]) => void;
  onSessionExpired: () => void;
}) {
  const { dictionary: t, locale } = useLocale();
  const dictionary = t.admin;
  const [availablePosts, setAvailablePosts] = useState<FacebookPost[]>([]);
  const [configured, setConfigured] = useState(initialConfigured);
  const [availableLoaded, setAvailableLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedPosts.map((post) => post.id)),
    [selectedPosts],
  );

  async function refreshPublishedPosts() {
    setRefreshing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/facebook-posts?refresh=1", { cache: "no-store" });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const body = await readResponse(response);
      const selections = readPosts(body.selectedPosts);
      if (selections) onSelectedPostsChange(selections);
      if (typeof body.configured === "boolean") setConfigured(body.configured);
      if (!response.ok) {
        setError(dictionary.facebookUnavailable);
        return;
      }
      const posts = readPosts(body.posts);
      if (posts) {
        setAvailablePosts(posts);
        setAvailableLoaded(true);
      }
    } catch {
      setError(dictionary.facebookUnavailable);
    } finally {
      setRefreshing(false);
    }
  }

  async function selectPost(id: string) {
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/facebook-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const body = await readResponse(response);
      if (!response.ok) {
        setError(dictionary.facebookUnavailable);
        return;
      }
      const selections = readPosts(body.selectedPosts);
      if (selections) onSelectedPostsChange(selections);
      setMessage(dictionary.facebookSelectedNotice);
    } catch {
      setError(dictionary.facebookUnavailable);
    } finally {
      setBusyId(null);
    }
  }

  async function removePost(id: string) {
    if (!window.confirm(dictionary.confirmRemoveFacebookPost)) return;
    setBusyId(id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/admin/facebook-posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (response.status === 401) {
        onSessionExpired();
        return;
      }
      const body = await readResponse(response);
      if (!response.ok || body.deleted !== true) {
        setError(dictionary.facebookUnavailable);
        return;
      }
      onSelectedPostsChange(selectedPosts.filter((post) => post.id !== id));
      setMessage(dictionary.facebookRemovedNotice);
    } catch {
      setError(dictionary.facebookUnavailable);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-facebook" aria-labelledby="admin-facebook-title">
      <div className="admin-facebook-header">
        <div>
          <span className="form-kicker">{dictionary.facebookLabel}</span>
          <h2 id="admin-facebook-title">{dictionary.facebookDashboard}</h2>
          <p>{dictionary.facebookIntro}</p>
        </div>
        <button
          className="button button-quiet"
          type="button"
          onClick={refreshPublishedPosts}
          disabled={refreshing || !configured}
        >
          {refreshing ? dictionary.facebookRefreshing : dictionary.facebookRefresh}
        </button>
      </div>
      <p className="admin-facebook-info-hint">{dictionary.facebookInfoHint}</p>

      {!configured ? (
        <div className="admin-config-note" role="note">
          <strong>{dictionary.facebookNotConfigured}</strong>
          <span>{dictionary.facebookNotConfiguredBody}</span>
        </div>
      ) : null}
      {message ? <p className="admin-notice" role="status">{message}</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}

      <div className="admin-facebook-grid">
        <section className="admin-facebook-panel" aria-labelledby="selected-facebook-posts-title">
          <div className="admin-facebook-panel-heading">
            <h3 id="selected-facebook-posts-title">{dictionary.selectedFacebookPosts}</h3>
            <span>{selectedPosts.length}</span>
          </div>
          {selectedPosts.length > 0 ? (
            selectedPosts.map((post) => (
              <FacebookPostCard
                key={post.id}
                post={post}
                locale={locale}
                imageOnly={dictionary.facebookImageOnly}
                openOnFacebook={dictionary.openOnFacebook}
                action={() => removePost(post.id)}
                actionLabel={dictionary.removeFacebookPost}
                actionClassName="text-button"
                actionDisabled={busyId === post.id}
              />
            ))
          ) : (
            <p className="admin-empty">{dictionary.noSelectedFacebookPosts}</p>
          )}
        </section>

        <section className="admin-facebook-panel" aria-labelledby="available-facebook-posts-title">
          <div className="admin-facebook-panel-heading">
            <h3 id="available-facebook-posts-title">{dictionary.availableFacebookPosts}</h3>
            {availableLoaded ? <span>{availablePosts.length}</span> : null}
          </div>
          {availableLoaded ? (
            availablePosts.length > 0 ? (
              availablePosts.map((post) => {
                const selected = selectedIds.has(post.id);
                return (
                  <FacebookPostCard
                    key={post.id}
                    post={post}
                    locale={locale}
                    imageOnly={dictionary.facebookImageOnly}
                    openOnFacebook={dictionary.openOnFacebook}
                    action={!selected ? () => selectPost(post.id) : undefined}
                    actionLabel={!selected ? dictionary.selectFacebookPost : undefined}
                    actionDisabled={busyId === post.id}
                    status={selected ? dictionary.facebookSelected : undefined}
                  />
                );
              })
            ) : <p className="admin-empty">{dictionary.noAvailableFacebookPosts}</p>
          ) : (
            <p className="admin-empty">{dictionary.facebookRefreshPrompt}</p>
          )}
        </section>
      </div>
    </section>
  );
}
