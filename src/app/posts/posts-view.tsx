"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowIcon, ChevronLeftIcon, ChevronRightIcon } from "@/app/icons";
import { useLocale } from "@/app/locale-provider";
import type { FacebookPost } from "@/lib/facebook-post-types";

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

const INFO_POST_MARKER = /(?:^|[^\p{L}\p{N}_])#ccs-info(?=$|[^\p{L}\p{N}_])/iu;

type CarouselLabels = {
  browse: string;
  previous: string;
  next: string;
  position: string;
};

type PostLabels = {
  postLabel: string;
  imageOnly: string;
  openOnFacebook: string;
};

function formatPostDate(value: string, locale: "en" | "mn"): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  if (locale === "mn") return `${year} оны ${month + 1} дүгээр сарын ${day}`;
  return `${MONTHS_EN[month]} ${day}, ${year}`;
}

function isInformationPost(post: FacebookPost): boolean {
  return INFO_POST_MARKER.test(post.message);
}

function FacebookPostImage({ id }: { id: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="facebook-post-image">
      <Image
        src={`/api/facebook-post-image/${encodeURIComponent(id)}`}
        alt=""
        fill
        sizes="(max-width: 640px) calc(100vw - 68px), 520px"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function FacebookPostCard({
  post,
  locale,
  labels,
}: {
  post: FacebookPost;
  locale: "en" | "mn";
  labels: PostLabels;
}) {
  const date = formatPostDate(post.createdTime, locale);

  return (
    <article className="facebook-post-card" aria-label={`${labels.postLabel}: ${date}`}>
      {post.fullPicture ? <FacebookPostImage id={post.id} /> : null}
      <div className="facebook-post-body">
        <time className="facebook-post-date" dateTime={post.createdTime}>{date}</time>
        <p className="facebook-post-message">
          {post.message || labels.imageOnly}
        </p>
        <a
          className="facebook-post-open"
          href={post.permalinkUrl}
          target="_blank"
          rel="noreferrer"
        >
          {labels.openOnFacebook} <ArrowIcon />
        </a>
      </div>
    </article>
  );
}

function FacebookPostCarousel({
  posts,
  locale,
  postLabels,
  carouselLabels,
  className,
}: {
  posts: FacebookPost[];
  locale: "en" | "mn";
  postLabels: PostLabels;
  carouselLabels: CarouselLabels;
  className: string;
}) {
  const trackRef = useRef<HTMLOListElement>(null);
  const [position, setPosition] = useState({ first: 0, last: 0, atEnd: posts.length <= 1 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const update = () => {
      const bounds = track.getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(track).paddingLeft);
      const cards = Array.from(track.children);
      let first = 0;
      let distance = Infinity;
      for (const [index, card] of cards.entries()) {
        const offset = Math.abs(card.getBoundingClientRect().left - bounds.left - padding);
        if (offset < distance) {
          first = index;
          distance = offset;
        }
      }
      let last = first;
      cards.forEach((card, index) => {
        if (index >= first && card.getBoundingClientRect().right <= bounds.right - padding + 1) {
          last = index;
        }
      });
      const atEnd = track.scrollWidth - track.clientWidth - track.scrollLeft <= 2;
      setPosition((previous) => (
        previous.first === first && previous.last === last && previous.atEnd === atEnd
          ? previous
          : { first, last, atEnd }
      ));
    };

    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", update);
    };
  }, [posts]);

  function scrollTo(index: number) {
    const track = trackRef.current;
    const card = track?.children[Math.max(0, Math.min(posts.length - 1, index))];
    if (!track || !card) return;
    const left = card.getBoundingClientRect().left - track.getBoundingClientRect().left
      + track.scrollLeft - parseFloat(getComputedStyle(track).paddingLeft);
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    track.scrollTo({ left, behavior });
  }

  const range = position.first === position.last
    ? String(position.first + 1)
    : `${position.first + 1}-${position.last + 1}`;

  return (
    <div className={`facebook-post-carousel ${className}`}>
      <ol
        className="facebook-post-track"
        ref={trackRef}
        tabIndex={0}
        aria-label={carouselLabels.browse}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            scrollTo(position.first + (event.key === "ArrowRight" ? 1 : -1));
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            scrollTo(event.key === "Home" ? 0 : posts.length - 1);
          }
        }}
      >
        {posts.map((post) => (
          <li className="facebook-post-item" key={post.id}>
            <FacebookPostCard post={post} locale={locale} labels={postLabels} />
          </li>
        ))}
      </ol>
      <div className="facebook-post-carousel-toolbar">
        <p className="facebook-post-carousel-position" aria-live="polite" aria-atomic="true">
          {carouselLabels.position
            .replace("{range}", range)
            .replace("{total}", String(posts.length))}
        </p>
        {posts.length > 1 ? (
          <div className="facebook-post-carousel-controls">
            <button
              type="button"
              aria-label={carouselLabels.previous}
              disabled={position.first === 0}
              onClick={() => scrollTo(position.first - 1)}
            >
              <ChevronLeftIcon />
            </button>
            <button
              type="button"
              aria-label={carouselLabels.next}
              disabled={position.atEnd}
              onClick={() => scrollTo(position.first + 1)}
            >
              <ChevronRightIcon />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PostsView({ posts }: { posts: FacebookPost[] }) {
  const { dictionary: t, locale } = useLocale();
  const dictionary = t.posts;
  const postLabels: PostLabels = {
    postLabel: dictionary.postLabel,
    imageOnly: dictionary.imageOnly,
    openOnFacebook: dictionary.openOnFacebook,
  };
  const informationPosts = posts.filter(isInformationPost);

  return (
    <div className="public-page posts-page">
      <div className="posts-opening section-wrap">
        <section className="posts-hero" aria-labelledby="posts-title">
          <div className="section-label">
            <span>{dictionary.label}</span>
          </div>
          <h1 id="posts-title">{dictionary.title}</h1>
          <p>{dictionary.intro}</p>
        </section>

        <section className="posts-section" aria-labelledby="posts-list-title">
          <div className="posts-section-heading">
            <div>
              <div className="section-label">
                <span>{dictionary.selectedLabel}</span>
              </div>
              <h2 id="posts-list-title">{dictionary.selected}</h2>
            </div>
          </div>

          {posts.length > 0 ? (
            <FacebookPostCarousel
              className="posts-selected-carousel"
              posts={posts}
              locale={locale}
              postLabels={postLabels}
              carouselLabels={{
                browse: dictionary.browseSelected,
                previous: dictionary.previousSelected,
                next: dictionary.nextSelected,
                position: dictionary.selectedPosition,
              }}
            />
          ) : (
            <p className="posts-empty">{dictionary.empty}</p>
          )}
        </section>
      </div>

      {informationPosts.length > 0 ? (
        <section className="posts-info-section section-wrap" aria-labelledby="posts-info-title">
          <div className="posts-section-heading">
            <div>
              <div className="section-label">
                <span>{dictionary.infoLabel}</span>
              </div>
              <h2 id="posts-info-title">{dictionary.info}</h2>
            </div>
          </div>
          <FacebookPostCarousel
            className="posts-info-carousel"
            posts={informationPosts}
            locale={locale}
            postLabels={postLabels}
            carouselLabels={{
              browse: dictionary.browseInfo,
              previous: dictionary.previousInfo,
              next: dictionary.nextInfo,
              position: dictionary.infoPosition,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
