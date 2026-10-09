import assert from "node:assert/strict";
import { test } from "node:test";
import { dictionaries } from "../src/app/i18n";

test("public page copy is clear and complete in both languages", () => {
  assert.equal(dictionaries.en.hero.description, "CCS is a student club at MUST. We run cybersecurity competitions, give talks, and hold hands-on sessions.");
  assert.equal(dictionaries.mn.hero.description, "CCS нь ШУТИС-ийн оюутны клуб. Бид мэдээллийн аюулгүй байдлын тэмцээн зохион байгуулж, лекц уншиж, дадлага сургалт явуулдаг.");
  assert.equal(dictionaries.en.about.pageTitle, "A cybersecurity club for MUST students.");
  assert.equal(dictionaries.en.posts.title, "Updates from CCS.");
  assert.equal(dictionaries.mn.posts.title, "CCS-ийн шинэ мэдээлэл.");
  assert.equal(dictionaries.en.posts.info, "CCS information");
  assert.equal(dictionaries.mn.posts.info, "CCS-ийн мэдээлэл");
  assert.equal(dictionaries.en.admin.facebookInfoHint, "A selected post containing #ccs-info also appears in the Information section on /posts.");
  assert.equal(dictionaries.mn.admin.facebookInfoHint, "#ccs-info шошготой сонгосон нийтлэл /posts хуудасны Мэдээлэл хэсэгт мөн гарна.");
  assert.equal(dictionaries.en.admin.selectFacebookPost, "Show on site");
  assert.equal(dictionaries.mn.admin.selectFacebookPost, "Сайтад харуулах");
  assert.equal(`${dictionaries.en.join.titleLine1} ${dictionaries.en.join.titleAccent}`, "Join us.");
  assert.equal(dictionaries.en.join.body, "No experience needed. Just come ready to learn.");
  assert.equal(`${dictionaries.mn.join.titleLine1} ${dictionaries.mn.join.titleAccent}`, "Бидэнтэй нэгдээрэй.");
  assert.equal(dictionaries.mn.join.body, "Туршлага шаардахгүй. Сурах хүсэл, эрмэлзэл байхад болно.");
  assert.ok(!dictionaries.mn.join.body.includes("Cурах"), "Mongolian Сурах uses the Cyrillic letter С");
});
