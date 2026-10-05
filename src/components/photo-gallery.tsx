"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { dictionaries } from "@/app/i18n";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/app/icons";
import type { GalleryPhoto } from "./gallery-plates";

/* Both locales hold the same keys, so the English shape is the contract. Typing
   it structurally rather than as `Dictionary["gallery"]` keeps a missing
   translation from becoming a union that no longer narrows on a plain string
   index. Note that a plate id in `gallery.json` is typed `string`, not a
   literal, so the cast below cannot catch an id with no copy: that check lives
   in `scripts/gallery-copy.mjs`, used by both the site and image builds. */
type EnglishGallery = (typeof dictionaries)["en"]["gallery"];
type GalleryItemId = keyof EnglishGallery["items"];

type GalleryDictionary = {
  [K in Exclude<keyof EnglishGallery, "items">]: string;
} & {
  items: { [K in GalleryItemId]: { alt: string; caption: string } };
};

/* A native <dialog> gives the viewer the things that are expensive to get right
   by hand: focus containment, Escape to close, inert background content, and
   focus returned to the tile that opened it. Two things still need handling —
   the page behind it must stop scrolling, and the dialog's own `close` event has
   to reach React state, because Escape closes the dialog without going through
   the close button.

   The photographs are build-time assets, so there is no fetch to fail and
   nothing to wait for beyond the browser decoding each file. The three states
   are therefore: the reserved tile box while an image decodes, a labelled
   placeholder if one fails, and the empty state if the plate list is empty.

   `photos` is a set, not a global: `/about` passes its lead-photo preview
   and `/gallery` passes the whole archive, so the viewer, its counter and
   its arrow keys all step through whichever set the page is actually showing. */
export default function PhotoGallery({
  photos,
  t,
}: {
  photos: GalleryPhoto[];
  t: GalleryDictionary;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const dialogRef = useRef<HTMLDialogElement>(null);

  const close = useCallback(() => setOpenIndex(null), []);

  const markFailed = useCallback((id: string) => {
    setFailed((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openIndex]);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((current) =>
        current === null ? current : (current + delta + photos.length) % photos.length,
      );
    },
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, step]);

  if (photos.length === 0) {
    return <p className="gallery-empty">{t.empty}</p>;
  }

  const markedLeadIndex = photos.findIndex((photo) => photo.lead);
  const leadIndex = markedLeadIndex === -1 ? 0 : markedLeadIndex;
  const lead = photos[leadIndex];
  const grid = photos.filter((_, index) => index !== leadIndex);
  const orderedPhotos = [lead, ...grid];

  const open: GalleryPhoto | null = openIndex === null ? null : orderedPhotos[openIndex];
  const openItem = open ? t.items[open.id as GalleryItemId] : null;
  const openPosition = openIndex === null ? 1 : openIndex + 1;

  function tile(photo: GalleryPhoto, index: number, className: string) {
    const item = t.items[photo.id as GalleryItemId];
    const isLead = index === 0;

    return (
      <li key={photo.id} className={className}>
        <button
          type="button"
          className="gallery-tile"
          aria-haspopup="dialog"
          onClick={() => setOpenIndex(index)}
        >
          {failed.has(photo.id) ? (
            <span className={`gallery-tile-missing${isLead ? " is-lead" : ""}`}>
              {t.missing}
            </span>
          ) : (
            <Image
              src={photo.src}
              alt={item.alt}
              width={photo.width}
              height={photo.height}
              sizes={
                isLead
                  ? "(max-width: 1240px) 100vw, 1180px"
                  : "(max-width: 640px) calc(100vw - 40px), (max-width: 940px) calc(50vw - 32px), (max-width: 1240px) calc(33vw - 30px), 382px"
              }
              loading="lazy"
              onError={() => markFailed(photo.id)}
            />
          )}
          <span className="gallery-tile-caption">{item.caption}</span>
        </button>
      </li>
    );
  }

  return (
    <>
      <ul className="gallery-grid">
        {tile(lead, 0, "gallery-cell gallery-cell-lead")}
        {grid.map((photo, position) => tile(photo, position + 1, "gallery-cell"))}
      </ul>

      <dialog
        ref={dialogRef}
        className="gallery-viewer"
        aria-label={t.viewerLabel}
        onClose={close}
        onClick={(event) => {
          // The stage and the bar are children of the dialog, so a click landing
          // on the dialog element itself is a click on the backdrop.
          if (event.target === dialogRef.current) close();
        }}
      >
        {open && openItem ? (
          <div className="gallery-viewer-inner">
            <div className="gallery-viewer-stage">
              {failed.has(open.id) ? (
                <p className="gallery-viewer-missing">{t.missing}</p>
              ) : (
                <Image
                  className="gallery-viewer-image"
                  src={open.src}
                  alt=""
                  width={open.width}
                  height={open.height}
                  sizes="(max-width: 1240px) 94vw, 1140px"
                  priority
                  onError={() => markFailed(open.id)}
                />
              )}
            </div>
            <div className="gallery-viewer-bar">
              {/* Announced when the arrow keys move through the set. */}
              <p className="gallery-viewer-caption" aria-live="polite">
                <span className="gallery-viewer-count">
                  {t.counter
                    .replace("{index}", String(openPosition))
                    .replace("{total}", String(photos.length))}
                </span>
                <span>{openItem.caption}</span>
              </p>
              <div className="gallery-viewer-controls">
                {photos.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="gallery-viewer-button"
                      aria-label={t.previous}
                      onClick={() => step(-1)}
                    >
                      <ChevronLeftIcon />
                    </button>
                    <button
                      type="button"
                      className="gallery-viewer-button"
                      aria-label={t.next}
                      onClick={() => step(1)}
                    >
                      <ChevronRightIcon />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="gallery-viewer-button"
                  aria-label={t.close}
                  onClick={close}
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
