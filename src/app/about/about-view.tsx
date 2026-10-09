"use client";

import Image from "next/image";
import { ArrowIcon } from "@/app/icons";
import { galleryHighlights } from "@/components/gallery-plates";
import { localizedHref, useLocale } from "@/app/locale-provider";
import { JOIN_URL } from "@/lib/site-config";
import clubStats from "@/data/club-stats.json";

export default function AboutView() {
  const { dictionary: t, locale } = useLocale();
  const aboutPhoto = galleryHighlights[0];
  const aboutPhotoAlt = t.gallery.items[aboutPhoto.id as keyof typeof t.gallery.items].alt;
  const stats = [
    { value: clubStats.founded, label: t.stats.founded },
    { value: clubStats.membersSpring2025_26, label: t.stats.members },
    { value: clubStats.mustCtf2025Participants, label: t.stats.mustCtf },
    { value: clubStats.ccsTalk6Participants, label: t.stats.talk },
  ];

  return (
    <div className="public-page about-page">
      <section className="about-opening section-wrap" aria-labelledby="about-title">
        <div className="page-hero about-opening-heading">
          <div className="section-label">
            <span>{t.about.label}</span>
          </div>
          <h1 id="about-title">{t.about.pageTitle}</h1>
          <p>{t.about.pageIntro}</p>
        </div>

        <div className="about-opening-photo">
          <Image
            src={aboutPhoto.src}
            alt={aboutPhotoAlt}
            width={aboutPhoto.width}
            height={aboutPhoto.height}
            sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 900px) calc(100vw - 64px), 836px"
          />
          <p className="about-gallery-status">{t.gallery.comingSoon}</p>
        </div>

        <section className="about-section about-copy about-opening-story" id="about">
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
        </section>

        <div className="stats-grid" role="group" aria-label={t.stats.label}>
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
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
