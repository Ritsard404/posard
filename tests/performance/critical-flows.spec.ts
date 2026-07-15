import { expect, test } from '@playwright/test';

import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';

type RouteMetrics = {
  path: string;
  phase: 'first-run' | 'warm';
  navigationMs: number;
  domContentLoadedMs: number;
  loadEventMs: number;
  firstContentfulPaintMs: number | null;
  largestContentfulPaintMs: number | null;
  cumulativeLayoutShift: number;
  longTaskCount: number;
  longestTaskMs: number;
  requestCount: number;
  transferredBytes: number;
};

declare global {
  interface Window {
    __e2ePerformance?: {
      lcp: number | null;
      cls: number;
      longTasks: number[];
    };
  }
}

test('records warm critical-route performance baselines @performance', async ({ page }) => {
  test.setTimeout(300_000);
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    await page.addInitScript(() => {
      window.__e2ePerformance = { lcp: null, cls: 0, longTasks: [] };
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const latest = entries.at(-1);
        if (latest && window.__e2ePerformance) window.__e2ePerformance.lcp = latest.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput && window.__e2ePerformance) {
            window.__e2ePerformance.cls += shift.value ?? 0;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((list) => {
        if (!window.__e2ePerformance) return;
        window.__e2ePerformance.longTasks.push(...list.getEntries().map((entry) => entry.duration));
      }).observe({ type: 'longtask', buffered: true });
    });
    await authenticatePageWithCredentials(page, managerCredentials);

    const results: RouteMetrics[] = [];
    const enforceProductionBudgets =
      process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes('npm run start') === true;
    for (const path of ['/dashboard', '/pos', '/product', '/reports']) {
      for (const phase of ['first-run', 'warm'] as const) {
        let requestCount = 0;
        let transferredBytes = 0;
        const onResponse = (response: import('@playwright/test').Response) => {
          requestCount += 1;
          transferredBytes += Number(response.headers()['content-length'] ?? 0);
        };
        page.on('response', onResponse);
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        await page.waitForLoadState('load', { timeout: 30_000 }).catch(() => undefined);
        await page.waitForTimeout(1_000);
        page.off('response', onResponse);

        const browserMetrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const fcp = performance.getEntriesByName('first-contentful-paint')[0];
          const observed = window.__e2ePerformance ?? { lcp: null, cls: 0, longTasks: [] };
          return {
            navigationMs: navigation.duration,
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            loadEventMs: navigation.loadEventEnd,
            firstContentfulPaintMs: fcp?.startTime ?? null,
            largestContentfulPaintMs: observed.lcp,
            cumulativeLayoutShift: observed.cls,
            longTaskCount: observed.longTasks.length,
            longestTaskMs: Math.max(0, ...observed.longTasks),
          };
        });
        const metrics = { path, phase, ...browserMetrics, requestCount, transferredBytes };
        results.push(metrics);

        expect(metrics.navigationMs, `${path} ${phase} navigation`).toBeLessThan(60_000);
        expect(metrics.cumulativeLayoutShift, `${path} ${phase} CLS`).toBeLessThanOrEqual(0.25);
        expect(metrics.longestTaskMs, `${path} ${phase} longest task`).toBeLessThan(2_000);
        expect(metrics.transferredBytes, `${path} ${phase} transferred bytes`).toBeLessThan(10 * 1024 * 1024);
        if (enforceProductionBudgets && phase === 'warm') {
          expect(metrics.navigationMs, `${path} warm production navigation`).toBeLessThanOrEqual(3_000);
          expect(metrics.largestContentfulPaintMs, `${path} warm production LCP`).not.toBeNull();
          expect(metrics.largestContentfulPaintMs!, `${path} warm production LCP`).toBeLessThanOrEqual(2_500);
          expect(metrics.cumulativeLayoutShift, `${path} warm production CLS`).toBeLessThanOrEqual(0.1);
          expect(metrics.longestTaskMs, `${path} warm production longest task`).toBeLessThanOrEqual(200);
        }
      }
    }

    await test.info().attach('critical-route-performance.json', {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: 'application/json',
    });
    console.info(`PERFORMANCE_BASELINE ${JSON.stringify(results)}`);
  } finally {
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
