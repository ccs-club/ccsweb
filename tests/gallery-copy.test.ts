import assert from "node:assert/strict";
import { test } from "node:test";
import { checkGalleryCopy, validateGalleryCopy } from "../scripts/gallery-copy.mjs";

const plates = [{ id: "test-photo" }];
function copy() {
  return {
    en: { gallery: { items: { "test-photo": { alt: "Test image", caption: "Test caption" } } } },
    mn: { gallery: { items: { "test-photo": { alt: "Туршилтын зураг", caption: "Туршилтын тайлбар" } } } },
  };
}

test("published gallery copy is complete", async () => {
  await checkGalleryCopy();
});

test("accepts complete copy in both locales and an empty gallery", () => {
  assert.doesNotThrow(() => validateGalleryCopy(plates, copy()));
  assert.doesNotThrow(() => validateGalleryCopy([], {}));
});

for (const locale of ["en", "mn"] as const) {
  test(`rejects a missing ${locale} item even when another section contains its id`, () => {
    const dictionaries = copy();
    Reflect.deleteProperty(dictionaries[locale].gallery.items, "test-photo");
    Object.assign(dictionaries[locale], { unrelated: { "test-photo": { alt: "Other", caption: "Other" } } });
    assert.throws(() => validateGalleryCopy(plates, dictionaries), new RegExp(`${locale}\\.gallery\\.items\\.test-photo`));
  });

  for (const field of ["alt", "caption"] as const) {
    test(`rejects missing, empty, whitespace or non-string ${locale} ${field}`, () => {
      for (const value of [undefined, "", "  ", 42]) {
        const dictionaries = copy();
        Object.assign(dictionaries[locale].gallery.items["test-photo"], { [field]: value });
        assert.throws(() => validateGalleryCopy(plates, dictionaries), new RegExp(`${locale}\\.gallery\\.items\\.test-photo\\.${field}`));
      }
    });
  }
}
