"use client";

import PhotoGallery from "@/components/photo-gallery";
import { galleryCount, galleryPhotos } from "@/components/gallery-plates";
import { useLocale } from "@/app/locale-provider";

export default function GalleryView() {
  const { dictionary: t } = useLocale();

  return (
    <section className="public-page gallery-section gallery-section-page" aria-labelledby="gallery-title">
      <div className="gallery-inner section-wrap">
        <div className="gallery-heading gallery-heading-page">
          <div className="section-label">
            <span>{t.gallery.label}</span>
            <span className="gallery-total" aria-hidden="true">
              {t.gallery.total.replace("{count}", String(galleryCount))}
            </span>
          </div>
          <h1 id="gallery-title">{t.galleryPage.title}</h1>
          <p>{t.galleryPage.intro}</p>
        </div>

        <PhotoGallery photos={galleryPhotos} t={t.gallery} />
      </div>
    </section>
  );
}
