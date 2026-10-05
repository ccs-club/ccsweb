"use client";

import { ArrowIcon } from "@/app/icons";
import PhotoGallery from "@/components/photo-gallery";
import { galleryCount, galleryHighlightCount, galleryHighlights } from "@/components/gallery-plates";
import { localizedHref, useLocale } from "@/app/locale-provider";
import { JOIN_URL } from "@/lib/site-config";
import clubStats from "@/data/club-stats.json";

export default function AboutView() {
  const { dictionary: t, locale } = useLocale();
  const stats = [
    { value: clubStats.founded, label: t.stats.founded },
    { value: clubStats.membersSpring2025_26, label: t.stats.members },
    { value: clubStats.mustCtf2025Participants, label: t.stats.mustCtf },
    { value: clubStats.ccsTalk6Participants, label: t.stats.talk },
  ];

  return (
    <div className="public-page about-page">
      <section className="page-hero section-wrap" aria-labelledby="about-title">
        <div className="section-label">
          <span>{t.about.label}</span>
        </div>
        <h1 id="about-title">{t.about.pageTitle}</h1>
        <p>{t.about.pageIntro}</p>
      </section>

      <section className="about-section section-wrap" id="about">
        <div className="about-copy">
          <h2>
            {t.about.titleLine1}
            <br />
            <span>{t.about.titleLine2}</span>
          </h2>
          <div className="about-details">
            <p>{t.about.body1}</p>
            <p>{t.about.body2}</p>
            <a className="text-link" href="#programs">
              {t.about.link} <ArrowIcon />
            </a>
          </div>
        </div>

        <div className="stats-grid" role="group" aria-label={t.stats.label}>
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Keep the About preview small; the complete archive lives on /gallery. */}
      <section className="gallery-section gallery-section-about" aria-labelledby="gallery-title">
        <div className="gallery-inner section-wrap">
          <div className="gallery-heading">
            <div className="section-label">
              <span>{t.gallery.label}</span>
              <span className="gallery-total" aria-hidden="true">
                {t.gallery.subset
                  .replace("{shown}", String(galleryHighlightCount))
                  .replace("{total}", String(galleryCount))}
              </span>
            </div>
            <h2 id="gallery-title">{t.gallery.title}</h2>
            <p>{t.gallery.body}</p>
          </div>

          <PhotoGallery photos={galleryHighlights} t={t.gallery} />

          <a className="text-link gallery-more" href={localizedHref("/gallery", locale)}>
            {t.gallery.seeAll.replace("{count}", String(galleryCount))} <ArrowIcon />
          </a>
        </div>
      </section>

      <section className="programs-section section-wrap" id="programs">
        <div className="programs-heading">
          <div className="section-label">
            <span>{t.programs.label}</span>
          </div>
          <h2>{t.programs.title}</h2>
        </div>

        <div className="program-list">
          {t.programs.items.map((program: { number: string; name: string; type: string; description: string }) => {
            const href =
              program.name === "MUST-CTF"
                ? null
                : program.name === "BANKSEC"
                  ? localizedHref("/events", locale)
                  : "#contact";
            const external = href?.startsWith("http") ?? false;
            const card = (
              <>
                <span className="program-number">{program.number}</span>
                <div className="program-copy">
                  <span className="program-type">{program.type}</span>
                  <h3>{program.name}</h3>
                  <p>{program.description}</p>
                </div>
                {href && (
                  <span className="program-arrow">
                    <ArrowIcon />
                  </span>
                )}
              </>
            );

            return href ? (
              <a
                className="program-card"
                href={href}
                key={program.number}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {card}
              </a>
            ) : (
              <div className="program-card program-card-static" key={program.number}>
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <section className="join-section" id="contact">
        <div className="join-inner section-wrap">
          <div className="section-label">
            <span>{t.join.label}</span>
          </div>
          <h2
            aria-label={`${t.join.titleLine1} ${t.join.titleAccent}`}
          >
            {t.join.titleLine1} <span>{t.join.titleAccent}</span>
          </h2>
          <p>{t.join.body}</p>
          <div className="hero-actions">
            <a
              className="button button-primary"
              href={JOIN_URL}
              target="_blank"
              rel="noreferrer"
            >
              {t.join.primaryCta} <ArrowIcon />
            </a>
            <span className="join-coming-soon">{t.join.ctfStatus}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
