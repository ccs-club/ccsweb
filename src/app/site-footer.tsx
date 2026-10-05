"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BoxIcon,
  DiscordIcon,
  FacebookIcon,
  InstagramIcon,
  MapPinIcon,
  YouTubeIcon,
} from "./icons";
import { localizedHref, useLocale } from "./locale-provider";

const socialLinks = [
  { name: "Facebook", href: "https://www.facebook.com/ccs.cybersec.club", Icon: FacebookIcon },
  { name: "Instagram", href: "https://www.instagram.com/sict_ccsclub/", Icon: InstagramIcon },
  { name: "Discord", href: "https://discord.gg/egsZnzur", Icon: DiscordIcon },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@computercommunicationsecur3464",
    Icon: YouTubeIcon,
  },
  {
    name: "Hack The Box",
    href: "https://ctf.hackthebox.com/team/overview/91609",
    Icon: BoxIcon,
  },
];

export default function SiteFooter() {
  const { dictionary: t, locale } = useLocale();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-branding">
          <Link className="footer-brand" href={localizedHref("/", locale)}>
            <Image
              src="/ccs-logo.png"
              alt=""
              width={40}
              height={40}
              sizes="40px"
              loading="eager"
              unoptimized
            />
            <span>CCS CLUB</span>
          </Link>
          <p>{t.footer.tagline}</p>
        </div>

        <div className="footer-group">
          <h2 className="footer-heading">{t.footer.contact}</h2>
          <address className="footer-contact-links">
            <a href="tel:+97680683288">8068 3288</a>
            <a href="tel:+97695558915">9555 8915</a>
            <a href="mailto:sict.ccsclub@gmail.com">
              sict.ccsclub@<wbr />gmail.com
            </a>
            <a
              className="footer-location"
              href="https://maps.app.goo.gl/WyeWjZngR8Bt5tyL6"
              target="_blank"
              rel="noreferrer"
            >
              <MapPinIcon />
              {t.footer.location}
            </a>
          </address>
        </div>

        <div className="footer-group">
          <h2 className="footer-heading">{t.footer.follow}</h2>
          <nav className="footer-social-links" aria-label={t.footer.follow}>
            {socialLinks.map(({ name, href, Icon }) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                <Icon />
                {name}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
