import { readFile } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";

export function validateGalleryCopy(plates, dictionaries) {
  const errors = [];
  for (const locale of ["en", "mn"]) {
    for (const { id } of plates) {
      const item = dictionaries[locale]?.gallery?.items?.[id];
      for (const field of ["alt", "caption"]) {
        if (typeof item?.[field] !== "string" || !item[field].trim()) {
          errors.push(`${locale}.gallery.items.${id}.${field} must be a non-empty string`);
        }
      }
    }
  }
  if (errors.length) {
    throw new Error(`Missing gallery copy:\n  ${errors.join("\n  ")}`);
  }
}

export async function checkGalleryCopy() {
  const spec = JSON.parse(await readFile(new URL("../src/data/gallery.json", import.meta.url), "utf8"));
  const { dictionaries } = await tsImport("../src/app/i18n.ts", import.meta.url);
  validateGalleryCopy(spec.plates, dictionaries);
  return spec;
}
