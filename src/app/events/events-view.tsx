"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/app/icons";
import type { Dictionary } from "@/app/i18n";
import type { Event, EventStatus, EventType } from "@/lib/event-types";
import { useLocale } from "@/app/locale-provider";

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

const EVENT_TAGS_MN: Record<string, string> = {
  Banking: "Банкны салбар",
  Community: "Клубын хамт олон",
  Duel: "Халз тэмцээн",
  National: "Улсын хэмжээний",
  Practice: "Дадлага",
  Security: "Мэдээллийн аюулгүй байдал",
  Teamwork: "Багаар ажиллах",
};

function formatDate(value: string, locale: "en" | "mn"): string {
  // Event dates are date-only and validated as YYYY-MM-DD. Keeping the
  // formatting deterministic avoids server/browser differences in Intl data.
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const year = date.getUTCFullYear();

  if (locale === "mn") return `${year} оны ${month + 1} дүгээр сарын ${day}`;
  return `${MONTHS_EN[month]} ${day}, ${year}`;
}

function eventYear(event: Event): string {
  return event.date.slice(0, 4);
}

function eventTitle(event: Event, locale: "en" | "mn"): string {
  return locale === "mn" ? event.titleMn : event.title;
}

function eventSummary(event: Event, locale: "en" | "mn"): string {
  return locale === "mn" ? event.summaryMn : event.summary;
}

function eventLocation(event: Event, locale: "en" | "mn"): string | undefined {
  return locale === "mn" ? event.locationMn || event.location : event.location;
}

function eventFormat(event: Event, locale: "en" | "mn"): string | undefined {
  return locale === "mn" ? event.formatMn || event.format : event.format;
}

function eventTeamSize(event: Event, locale: "en" | "mn"): string | undefined {
  return locale === "mn"
    ? event.teamSizeMn || event.teamSize
    : event.teamSize;
}

function eventTag(tag: string, locale: "en" | "mn"): string {
  if (locale === "en") return tag;
  return EVENT_TAGS_MN[tag] || tag;
}

function eventPrize(event: Event, locale: "en" | "mn"): string | undefined {
  return locale === "mn" ? event.prizeMn || event.prize : event.prize;
}

function statusClass(status: EventStatus): string {
  return `event-status event-status-${status}`;
}

function EventCover({
  src,
  compact = false,
}: {
  src: string;
  compact?: boolean;
}) {
  return (
    <div className={`event-cover ${compact ? "event-cover-compact" : ""}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={
          compact
            ? "(max-width: 640px) calc(100vw - 40px), (max-width: 1180px) calc(50vw - 40px), 550px"
            : "(max-width: 640px) calc(100vw - 40px), (max-width: 940px) calc(100vw - 64px), (max-width: 1180px) calc(55vw - 35px), 614px"
        }
      />
    </div>
  );
}

function EventCard({
  event,
  dictionary,
  locale,
  featured = false,
  titleId,
}: {
  event: Event;
  dictionary: Dictionary["events"];
  locale: "en" | "mn";
  featured?: boolean;
  titleId?: string;
}) {
  const title = eventTitle(event, locale);
  const typeLabel = dictionary.types[event.type as EventType];
  const statusLabel = dictionary.status[event.status];
  const details: Array<{ label: string; value?: string }> = [
    { label: dictionary.details.format, value: eventFormat(event, locale) },
    { label: dictionary.details.location, value: eventLocation(event, locale) },
    { label: dictionary.details.teamSize, value: eventTeamSize(event, locale) },
    { label: dictionary.details.prize, value: eventPrize(event, locale) },
  ];
  const visibleDetails = details.filter(
    (detail): detail is { label: string; value: string } =>
      typeof detail.value === "string" && detail.value.length > 0,
  );
  const hasCover = Boolean(event.coverImage);

  return (
    <article
      className={`event-card ${featured ? "event-card-featured" : ""} ${hasCover ? "" : "event-card-no-cover"}`}
    >
      {event.coverImage ? (
        <EventCover src={event.coverImage} compact={!featured} />
      ) : (
        /* No photo on record. Rather than leave a hole in the grid, the card
           carries the same crop marks the hero uses, so it reads as a
           deliberate slot instead of a missing image. */
        <div className="event-cover event-cover-empty" aria-hidden="true">
          <span className="event-cover-mark">{dictionary.types[event.type as EventType]}</span>
        </div>
      )}
      <div className="event-card-body">
        <div className="event-card-topline">
          <span className="event-type">{typeLabel}</span>
          <span className={statusClass(event.status)}>{statusLabel}</span>
        </div>
        <h3 id={titleId}>{title}</h3>
        <div className="event-date">
          <time dateTime={event.date}>{formatDate(event.date, locale)}</time>
          {event.endDate ? (
            <>
              {locale === "mn" ? " – " : ` ${dictionary.rangeSeparator} `}
              <time dateTime={event.endDate}>
                {formatDate(event.endDate, locale)}
              </time>
            </>
          ) : null}
        </div>
        <p className="event-summary">{eventSummary(event, locale)}</p>

        {visibleDetails.length > 0 ? (
          <dl className="event-details">
            {visibleDetails.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {event.tags.length > 0 ? (
          <ul className="event-tags" aria-label={dictionary.tagsLabel}>
            {event.tags.map((tag) => <li key={tag}>{eventTag(tag, locale)}</li>)}
          </ul>
        ) : null}

        {event.registrationUrl ? (
          <a
            className="event-register"
            href={event.registrationUrl}
            target="_blank"
            rel="noreferrer"
          >
            {dictionary.register}
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function EventArchive({ events, dictionary, locale }: {
  events: Event[];
  dictionary: Dictionary["events"];
  locale: "en" | "mn";
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState<Event | null>(null);
  const [position, setPosition] = useState({ first: 0, last: 0, atEnd: events.length === 1 });

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
        if (offset < distance) { first = index; distance = offset; }
      }
      let last = first;
      cards.forEach((card, index) => {
        if (index >= first && card.getBoundingClientRect().right <= bounds.right - padding + 1) last = index;
      });
      const atEnd = track.scrollWidth - track.clientWidth - track.scrollLeft <= 2;
      setPosition((previous) => previous.first === first && previous.last === last && previous.atEnd === atEnd
        ? previous : { first, last, atEnd });
    };
    const observer = new ResizeObserver(update);
    observer.observe(track);
    track.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); track.removeEventListener("scroll", update); };
  }, [events]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (opened && !dialog.open) dialog.showModal();
    if (!opened && dialog.open) dialog.close();
    if (!opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [opened]);

  function scrollTo(index: number) {
    const track = trackRef.current;
    const card = track?.children[Math.max(0, Math.min(events.length - 1, index))];
    if (!track || !card) return;
    const left = card.getBoundingClientRect().left - track.getBoundingClientRect().left
      + track.scrollLeft - parseFloat(getComputedStyle(track).paddingLeft);
    track.scrollTo({ left, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  const range = position.first === position.last
    ? String(position.first + 1) : `${position.first + 1}-${position.last + 1}`;

  return (
    <div className="event-archive">
      <ul
        className="event-preview-track"
        ref={trackRef}
        tabIndex={0}
        aria-label={dictionary.archiveBrowse}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            scrollTo(position.first + (event.key === "ArrowRight" ? 1 : -1));
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            scrollTo(event.key === "Home" ? 0 : events.length - 1);
          }
        }}
      >
        {events.map((event) => (
          <li className="event-preview-item" key={event.id}>
            <article className="event-card event-preview">
              {event.coverImage ? <EventCover src={event.coverImage} compact /> : (
                <div className="event-cover event-cover-empty" aria-hidden="true">
                  <span className="event-cover-mark">{dictionary.types[event.type]}</span>
                </div>
              )}
              <div className="event-card-body">
                <div className="event-card-topline">
                  <span className="event-type">{dictionary.types[event.type]}</span>
                  <span className={statusClass(event.status)}>{dictionary.status[event.status]}</span>
                </div>
                <h3>{eventTitle(event, locale)}</h3>
                <div className="event-date">
                  <time dateTime={event.date}>{formatDate(event.date, locale)}</time>
                  {event.endDate && <> {dictionary.rangeSeparator} <time dateTime={event.endDate}>{formatDate(event.endDate, locale)}</time></>}
                </div>
                <button
                  type="button"
                  className="event-preview-open"
                  aria-label={`${dictionary.viewDetails}: ${eventTitle(event, locale)}`}
                  aria-haspopup="dialog"
                  onClick={() => setOpened(event)}
                >{dictionary.viewDetails}</button>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <div className="event-archive-toolbar">
        <p className="event-archive-position" aria-live="polite" aria-atomic="true">
          {dictionary.previewPosition.replace("{range}", range).replace("{total}", String(events.length))}
        </p>
        {events.length > 1 && (
          <div className="event-archive-controls">
            <button type="button" aria-label={dictionary.previousPreview} disabled={position.first === 0} onClick={() => scrollTo(position.first - 1)}><ChevronLeftIcon /></button>
            <button type="button" aria-label={dictionary.nextPreview} disabled={position.atEnd} onClick={() => scrollTo(position.first + 1)}><ChevronRightIcon /></button>
          </div>
        )}
      </div>
      <dialog
        ref={dialogRef}
        className="event-details-dialog"
        aria-labelledby="event-details-title"
        onClose={() => setOpened(null)}
        onClick={(event) => { if (event.target === dialogRef.current) setOpened(null); }}
      >
        {opened && (
          <>
            <div className="event-dialog-toolbar">
              <button type="button" autoFocus aria-label={dictionary.closeDetails} onClick={() => setOpened(null)}><CloseIcon /></button>
            </div>
            <EventCard event={opened} dictionary={dictionary} locale={locale} titleId="event-details-title" />
          </>
        )}
      </dialog>
    </div>
  );
}

export default function EventsView({ events }: { events: Event[] }) {
  const { dictionary: t, locale } = useLocale();
  const dictionary = t.events;
  const featured = events.find((event) => event.featured);
  const pastEvents = useMemo(
    () =>
      events
        .filter((event) => event.status === "ended")
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events],
  );
  const years = useMemo(
    () => [...new Set(pastEvents.map(eventYear))].sort((a, b) => Number(b) - Number(a)),
    [pastEvents],
  );
  const mostRecentYear = pastEvents[0] ? eventYear(pastEvents[0]) : "";
  /* Open on the whole archive, not the newest year. The page advertises an
     event count in its own hero, so starting on a year filter showed two of
     eight and read as though the rest were missing. The year buttons are a
     filter the reader opts into, not a hidden default. */
  const [selectedYear, setSelectedYear] = useState("all");
  // A featured event that has already ended is not a "what's next" headline, so
  // it stays in the archive rather than occupying the featured slot.
  const featureWorthy = Boolean(featured && featured.status !== "ended");
  const showFeatured = featureWorthy;
  const currentEvents = useMemo(
    () =>
      events
        .filter(
          (event) =>
            event.status !== "ended" &&
            !(showFeatured && event.id === featured?.id),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events, featured?.id, showFeatured],
  );
  const visiblePastEvents =
    selectedYear === "all"
      ? pastEvents
      : pastEvents.filter((event) => eventYear(event) === selectedYear);
  const yearCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of pastEvents) {
      const year = eventYear(event);
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    return counts;
  }, [pastEvents]);

  return (
    <div className="public-page events-page">
      <section className="events-hero events-opening section-wrap" aria-labelledby="events-title">
        <div className="section-label">
          <span>{dictionary.label}</span>
        </div>
        <h1 id="events-title">{dictionary.title}</h1>
        <p>{dictionary.intro}</p>
        <div className="events-stats" role="group" aria-label={dictionary.statsLabel}>
          <div>
            <strong>{pastEvents.length}</strong>
            <span>{dictionary.stats.events}</span>
          </div>
          <div>
            <strong>{years.length}</strong>
            <span>{dictionary.stats.years}</span>
          </div>
          <div>
            <strong>{mostRecentYear || "-"}</strong>
            <span>{dictionary.stats.latest}</span>
          </div>
        </div>
      </section>

      {/* Collapsed entirely when nothing is scheduled. A heading promising
          events over a line saying there are none is worse than no heading,
          and the archive below carries the same information honestly. */}
      {currentEvents.length > 0 ? (
        <section className="events-section section-wrap" aria-labelledby="current-events-title">
          <div className="events-section-heading">
            <div>
              <div className="section-label">
                <span>{dictionary.upcomingLabel}</span>
              </div>
              <h2 id="current-events-title">{dictionary.upcoming}</h2>
            </div>
          </div>
          <div className="event-card-grid event-card-grid-current">
            {currentEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                dictionary={dictionary}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}

      {showFeatured && featured ? (
        <section className="events-featured-section section-wrap" aria-label={dictionary.featured}>
          <div className="section-label">
            <span>{dictionary.featuredLabel}</span>
          </div>
          <EventCard
            event={featured}
            dictionary={dictionary}
            locale={locale}
            featured
          />
        </section>
      ) : null}

      <section className="events-section events-past-section section-wrap" aria-labelledby="past-events-title">
        <div className="events-section-heading events-past-heading">
          <div>
            <div className="section-label">
              <span>{dictionary.pastLabel}</span>
            </div>
            <h2 id="past-events-title">{dictionary.past}</h2>
          </div>
          {years.length > 0 ? (
            <div className="year-grid" role="group" aria-label={dictionary.yearLabel}>
              <button
                type="button"
                className={selectedYear === "all" ? "is-active" : ""}
                onClick={() => setSelectedYear("all")}
                aria-pressed={selectedYear === "all"}
              >
                {dictionary.allYears}
                <span className="year-count">{pastEvents.length}</span>
                <span className="sr-only">
                  {dictionary.eventsCountSuffix}
                </span>
              </button>
              {years.map((year) => {
                const count = yearCounts.get(year) ?? 0;
                return (
                  <button
                    type="button"
                    key={year}
                    className={selectedYear === year ? "is-active" : ""}
                    onClick={() => setSelectedYear(year)}
                    aria-pressed={selectedYear === year}
                  >
                    {year}
                    <span className="year-count">{count}</span>
                    <span className="sr-only">
                      {dictionary.eventsCountSuffix}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {visiblePastEvents.length > 0 ? (
          <EventArchive key={selectedYear} events={visiblePastEvents} dictionary={dictionary} locale={locale} />
        ) : (
          <p className="events-empty">{dictionary.empty}</p>
        )}
      </section>
    </div>
  );
}
