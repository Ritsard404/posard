import assert from "node:assert/strict";
import test from "node:test";

import robots from "../../app/robots";
import sitemap from "../../app/sitemap";
import { faqJsonLd, publicPages, siteConfig } from "../../lib/seo";

test("sitemap contains every public marketing page", () => {
  const urls = new Set(sitemap().map((entry) => entry.url));

  assert.ok(urls.has(`${siteConfig.url}/`));
  for (const page of Object.values(publicPages)) {
    assert.ok(urls.has(`${siteConfig.url}${page.path}`), `missing ${page.path}`);
  }
});

test("robots keeps public pages crawlable and excludes private application routes", () => {
  const config = robots();
  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  const disallow = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];

  assert.equal(rules.allow, "/");
  assert.ok(disallow.includes("/dashboard"));
  assert.ok(disallow.includes("/reports"));
  assert.ok(disallow.includes("/api/"));
  assert.equal(config.sitemap, `${siteConfig.url}/sitemap.xml`);
});

test("FAQ schema mirrors visible questions and answers", () => {
  const schema = faqJsonLd([
    { question: "Can I use POSard?", answer: "Yes." },
  ]);

  assert.equal(schema["@type"], "FAQPage");
  assert.equal(schema.mainEntity[0].name, "Can I use POSard?");
  assert.equal(schema.mainEntity[0].acceptedAnswer.text, "Yes.");
});
