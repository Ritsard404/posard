import assert from "node:assert/strict";
import test from "node:test";

import {
  detectRequestAppMode,
  getMobileAppRouteRestriction,
  isMobileAppHrefAllowed,
} from "@/lib/mobile-app-mode";

test("detects mobile app mode from query, cookie, and browser headers", () => {
  assert.equal(
    detectRequestAppMode({
      queryValue: "capacitor-android",
      cookieValue: "desktop-browser",
    }),
    "capacitor-android",
  );
  assert.equal(
    detectRequestAppMode({
      cookieValue: "tablet-browser",
      userAgent: "Mozilla/5.0",
    }),
    "tablet-browser",
  );
  assert.equal(
    detectRequestAppMode({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel) Mobile",
    }),
    "phone-browser",
  );
  assert.equal(
    detectRequestAppMode({
      userAgent: "Mozilla/5.0 (Linux; Android 14; Tablet)",
    }),
    "tablet-browser",
  );
});

test("allows checkout-critical routes in mobile/tablet app mode", () => {
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/pos",
      mode: "capacitor-android",
    }).restricted,
    false,
  );
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/sync",
      mode: "phone-browser",
    }).restricted,
    false,
  );
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/companies/company-1/terminals",
      search: "?view=printer",
      mode: "tablet-browser",
    }).restricted,
    false,
  );
});

test("restricts heavy routes in mobile/tablet app mode but not desktop", () => {
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/reports/sales",
      mode: "capacitor-android",
    }).restricted,
    true,
  );
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/feature-guide",
      mode: "phone-browser",
    }).restricted,
    true,
  );
  assert.equal(
    getMobileAppRouteRestriction({
      pathname: "/reports/sales",
      mode: "desktop-browser",
    }).restricted,
    false,
  );
});

test("filters mobile app shell links to allowed routes", () => {
  assert.equal(
    isMobileAppHrefAllowed("/companies/company-1/terminals?view=printer", "tablet-browser"),
    true,
  );
  assert.equal(
    isMobileAppHrefAllowed("/companies/company-1/terminals?view=list", "tablet-browser"),
    false,
  );
  assert.equal(isMobileAppHrefAllowed("/reports/ai", "phone-browser"), false);
  assert.equal(isMobileAppHrefAllowed("/reports/ai", "desktop-browser"), true);
});
