"use client";

import Link from "next/link";
import MatrixField from "./matrix-field";
import { ArrowIcon } from "./icons";
import SiteHeader from "./site-header";
import { localizedHref, useLocale } from "./locale-provider";
import { JOIN_URL } from "@/lib/site-config";
import clubStats from "@/data/club-stats.json";

function HeroFact({ template, value }: { template: string; value: string }) {
  const [before, after = ""] = template.split("{value}");

  return (
    <li>
      {before}
      <strong>{value}</strong>
      {after}
    </li>
  );
}

/* The home page is one screen and does not scroll. Everything that used to sit
   below the fold now lives on `/about`, so the hero has to carry the club's
   whole proposition by itself: what it is, and the three numbers behind it. */
export default function Home() {
  const { dictionary: t, locale } = useLocale();
  const facts = [
    { value: clubStats.founded, template: t.hero.facts.founded },
    { value: clubStats.membersSpring2025_26, template: t.hero.facts.members },
    { value: clubStats.mustCtf2025Participants, template: t.hero.facts.mustCtf },
  ];

  return (
    <div className="site-shell home-shell">
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
              <Link className="button button-primary" href={localizedHref("/about", locale)}>
                {t.hero.primaryCta} <ArrowIcon />
              </Link>
              <a
                className="button button-quiet"
                href={JOIN_URL}
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.secondaryCta} <ArrowIcon />
              </a>
            </div>

            {/* Sourced from `club-stats.json`, the same file the about page
                reads. The hero states the club's scale rather than asking the
                visitor to scroll to find it. */}
            <ul className="hero-facts" aria-label={t.hero.factsLabel}>
              {facts.map((fact) => (
                <HeroFact key={fact.template} {...fact} />
              ))}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
