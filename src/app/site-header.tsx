"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
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
  const mobileNavRef = useRef<HTMLDetailsElement>(null);

  const navItems = [
    { href: "/", label: t.nav.home },
    { href: "/about", label: t.nav.about },
    { href: "/events", label: t.nav.events },
    { href: "/posts", label: t.nav.posts },
  ];

  useEffect(() => {
    const closeMenu = () => {
      if (mobileNavRef.current?.open) mobileNavRef.current.open = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      const menu = mobileNavRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function onNavigate(event: { preventDefault: () => void }) {
    if (hasUnsavedChanges && !window.confirm(t.admin.discardUnsaved)) {
      event.preventDefault();
      return;
    }
    if (mobileNavRef.current?.open) mobileNavRef.current.open = false;
  }

  function renderNavLinks() {
    return navItems.map(({ href, label }) => {
      const active = isCurrentPath(pathname, href);
      return (
        <Link
          key={href}
          href={localizedHref(href, locale)}
          onNavigate={onNavigate}
          className={active ? "is-active" : undefined}
          aria-current={active ? "page" : undefined}
        >
          {label}
        </Link>
      );
    });
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
        {renderNavLinks()}
      </nav>

      <div className="nav-actions">
        <LocaleToggle />
      </div>

      <details className="mobile-nav" ref={mobileNavRef}>
        <summary>
          <span className="mobile-menu-label">{t.nav.menu}</span>
          <span className="mobile-menu-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </summary>
        <nav className="mobile-nav-panel" aria-label={t.nav.menu}>
          {renderNavLinks()}
        </nav>
      </details>
    </header>
  );
}
