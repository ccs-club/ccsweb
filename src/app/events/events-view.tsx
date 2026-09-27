"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
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
  Duel: "Дуэль",
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

  if (locale === "mn") return `${year} оны ${month + 1}-р сарын ${day}`;
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
}: {
  event: Event;
  dictionary: Dictionary["events"];
  locale: "en" | "mn";
  featured?: boolean;
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
        <h3>{title}</h3>
        <time className="event-date" dateTime={event.date}>
          {formatDate(event.date, locale)}
          {event.endDate
            ? locale === "mn"
              ? `-аас ${formatDate(event.endDate, locale)} хүртэл`
              : ` ${dictionary.rangeSeparator} ${formatDate(event.endDate, locale)}`
            : ""}
        </time>
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
  // Open on the newest year rather than the whole archive: a visitor wants
  // what the club has been doing lately, not eight events back to 2022.
  // Falls back to "all" when there is no archive to narrow.
  const [selectedYear, setSelectedYear] = useState(() => mostRecentYear || "all");
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

  return (
    <div className="events-page">
      <section className="events-hero section-wrap" aria-labelledby="events-title">
        <div className="section-label">
          <span>{dictionary.label}</span>
        </div>
        <h1 id="events-title">{dictionary.title}</h1>
        <p>{dictionary.intro}</p>
        <div className="events-stats" role="group" aria-label={dictionary.statsLabel}>
          <div>
            <strong>{pastEvents.length > 0 ? `${pastEvents.length}+` : "0"}</strong>
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

      <section className="events-section section-wrap" aria-labelledby="current-events-title">
        <div className="events-section-heading">
          <div>
            <div className="section-label">
              <span>{dictionary.upcomingLabel}</span>
            </div>
            <h2 id="current-events-title">{dictionary.upcoming}</h2>
          </div>
        </div>
        {currentEvents.length > 0 ? (
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
        ) : (
          <p className="events-empty">
            {showFeatured
              ? dictionary.noOtherUpcoming
              : dictionary.noUpcoming}
          </p>
        )}
      </section>

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
              </button>
              {years.map((year) => (
                <button
                  type="button"
                  key={year}
                  className={selectedYear === year ? "is-active" : ""}
                  onClick={() => setSelectedYear(year)}
                  aria-pressed={selectedYear === year}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {visiblePastEvents.length > 0 ? (
          <div className="event-card-grid">
            {visiblePastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                dictionary={dictionary}
                locale={locale}
              />
            ))}
          </div>
        ) : (
          <p className="events-empty">{dictionary.empty}</p>
        )}
      </section>
    </div>
  );
}
