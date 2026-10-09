"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LocaleToggle from "./locale-toggle";
import { localizedHref, useLocale } from "./locale-provider";
import { useUnsavedChanges } from "./unsaved-changes";

function isCurrentPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const { dictionary: t, locale } = useLocale();
  const { hasUnsavedChanges } = useUnsavedChanges();
  const pathname = usePathname();

  function onNavigate(event: { preventDefault: () => void }) {
    if (hasUnsavedChanges && !window.confirm(t.admin.discardUnsaved)) {
      event.preventDefault();
    }
  }

  return (
    <header className="site-header">
      <a className="skip-link" href="#main-content">
        {t.nav.skip}
      </a>
      <Link className="brand" href={localizedHref("/", locale)} onNavigate={onNavigate}>
        <Image
          src="/ccs-logo.png"
          alt=""
          width={42}
          height={42}
          sizes="42px"
          loading="eager"
          unoptimized
        />
        <span className="brand-copy">
          <strong>CCS</strong>
          <small>COMPUTER COMMUNICATION SECURITY</small>
        </span>
      </Link>

      <nav className="main-nav" aria-label={t.nav.menu}>
        <Link
          href={localizedHref("/", locale)}
          onNavigate={onNavigate}
          className={pathname === "/" ? "is-active" : undefined}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          {t.nav.home}
        </Link>
        <Link
          href={localizedHref("/about", locale)}
          onNavigate={onNavigate}
          className={pathname === "/about" ? "is-active" : undefined}
          aria-current={pathname === "/about" ? "page" : undefined}
        >
          {t.nav.about}
        </Link>
        <Link
          href={localizedHref("/events", locale)}
          onNavigate={onNavigate}
          className={isCurrentPath(pathname, "/events") ? "is-active" : undefined}
          aria-current={isCurrentPath(pathname, "/events") ? "page" : undefined}
        >
          {t.nav.events}
        </Link>
        <Link
          href={localizedHref("/posts", locale)}
          onNavigate={onNavigate}
          className={pathname === "/posts" ? "is-active" : undefined}
          aria-current={pathname === "/posts" ? "page" : undefined}
        >
          {t.nav.posts}
        </Link>
      </nav>

      <div className="nav-actions">
        <LocaleToggle />
      </div>

      <details className="mobile-nav">
        <summary>
          <span className="mobile-menu-label">{t.nav.menu}</span>
          <span className="mobile-menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </summary>
        <nav className="mobile-nav-panel" aria-label={t.nav.menu}>
          <Link href={localizedHref("/", locale)} onNavigate={onNavigate}>{t.nav.home}</Link>
          <Link href={localizedHref("/about", locale)} onNavigate={onNavigate}>{t.nav.about}</Link>
          <Link href={localizedHref("/events", locale)} onNavigate={onNavigate}>{t.nav.events}</Link>
          <Link href={localizedHref("/posts", locale)} onNavigate={onNavigate}>{t.nav.posts}</Link>
        </nav>
      </details>
    </header>
  );
}
