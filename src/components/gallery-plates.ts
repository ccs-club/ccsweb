import gallerySpec from "@/data/gallery.json";

export type GalleryPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  lead: boolean;
};

/* `src/data/gallery.json` is the single list both the build script and this
   component read, so the order, crop and filenames cannot drift apart. The
   declared width is the width the build script writes; keep it at or below the
   source's own width or the build warns and caps it. */
export const galleryPhotos: GalleryPhoto[] = gallerySpec.plates.map((plate) => ({
  id: plate.id,
  src: `/gallery/${plate.id}.webp`,
  width: plate.width,
  height: Math.round(plate.width / plate.ratio),
  lead: plate.lead ?? false,
}));

export const galleryCount = galleryPhotos.length;

/* About's photo selection comes from the same spec that retains the archive data. */
export const galleryHighlights: GalleryPhoto[] = galleryPhotos.filter(
  (photo, index) => photo.lead || gallerySpec.plates[index]?.feature === true,
);

export const galleryHighlightCount = galleryHighlights.length;
