"use client";

import MatrixField from "./matrix-field";
import { ArrowIcon } from "./icons";
import SiteFooter from "./site-footer";
import SiteHeader from "./site-header";
import { useLocale } from "./locale-provider";
import { CTF_URL, JOIN_URL } from "@/lib/site-config";
import clubStats from "@/data/club-stats.json";

export default function Home() {
  const { dictionary: t } = useLocale();
  const stats = [
    { value: clubStats.founded, label: t.stats.founded },
    { value: clubStats.membersSpring2025_26, label: t.stats.members },
    { value: clubStats.mustCtf2025Participants, label: t.stats.mustCtf },
    { value: clubStats.ccsTalk6Participants, label: t.stats.talk },
  ];

  return (
    <div className="site-shell">
      <SiteHeader />

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <MatrixField />

          <div className="hero-content">
            <h1
              id="hero-title"
              aria-label={`${t.hero.line1} ${t.hero.line2} ${t.hero.line3}`}
            >
              <span>{t.hero.line1}</span>
              <span>{t.hero.line2}</span>
              <span className="accent-text">{t.hero.line3}</span>
            </h1>
            <p className="hero-description">{t.hero.description}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#about">
                {t.hero.primaryCta} <ArrowIcon />
              </a>
              <a
                className="button button-quiet"
                href={JOIN_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.secondaryCta} <ArrowIcon />
              </a>
            </div>
          </div>

          <div className="hero-footnote">
            <a href="#about" aria-label={t.hero.scroll}>
              <span className="scroll-mark" aria-hidden="true">↓</span>
            </a>
          </div>        </section>

        <section className="about-section section-wrap" id="about">
          <div className="section-label">
            <span>{t.about.label}</span>
          </div>
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

        <section className="programs-section section-wrap" id="programs">
          <div className="programs-heading">
            <div className="section-label">
              <span>{t.programs.label}</span>
            </div>
            <h2>{t.programs.title}</h2>
          </div>

          <div className="program-list">
            {t.programs.items.map((program) => {
              const href =
                program.name === "MUST-CTF"
                  ? CTF_URL
                  : program.name === "BANKSEC"
                    ? "/events"
                    : "#contact";
              const external = href.startsWith("http");
              return (
                <a
                  className="program-card"
                  href={href}
                  key={program.number}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                >
                  <span className="program-number">{program.number}</span>
                  <div className="program-copy">
                    <span className="program-type">{program.type}</span>
                    <h3>{program.name}</h3>
                    <p>{program.description}</p>
                  </div>
                  <span className="program-arrow">
                    <ArrowIcon />
                  </span>
                </a>
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
              aria-label={`${t.join.titleLine1} ${t.join.titleAccent} ${t.join.titleLine2}`}
            >
              {t.join.titleLine1}{" "}
              <span>{t.join.titleAccent}</span> {t.join.titleLine2}
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
              <a
                className="button button-quiet"
                href={CTF_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t.join.secondaryCta} <ArrowIcon />
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
