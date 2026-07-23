import { expect, test } from '@playwright/test';

import { prisma } from '../../lib/prisma';
import {
  authenticatePageWithCredentials,
  ensureAuthUserForProfile,
  ensurePosResponsiveProfiles,
  managerCredentials,
} from '../fixtures/auth.fixture';
import { assertE2EDatabaseWritesAllowed } from '../fixtures/e2e-environment';

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
        await page.waitForFunction(
          () => performance.getEntriesByName('first-contentful-paint').length > 0,
          undefined,
          { timeout: 15_000 },
        ).catch(() => undefined);
        await page.evaluate(() => new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ));
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

test('keeps a 1,000-product POS responsive through a 20-sale loop @performance @destructive', async ({
  page,
}) => {
  test.setTimeout(600_000);
  assertE2EDatabaseWritesAllowed();
  const profiles = await ensurePosResponsiveProfiles();
  let authUser: Awaited<ReturnType<typeof ensureAuthUserForProfile>> | null = null;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let categoryId: string | null = null;
  let terminalId: string | null = null;
  let timestampId: string | null = null;

  try {
    authUser = await ensureAuthUserForProfile(managerCredentials);
    const manager = await prisma.profile.findUniqueOrThrow({
      where: { email: managerCredentials.email },
      select: { id: true },
    });
    const category = await prisma.category.create({
      data: {
        companyId: profiles.companyId,
        categoryName: `E2E PERF ${suffix}`,
      },
      select: { id: true },
    });
    categoryId = category.id;
    const productPrefix = `E2E PERF PRODUCT ${suffix}`;
    await prisma.product.createMany({
      data: Array.from({ length: 1_000 }, (_, index) => ({
        companyId: profiles.companyId,
        categoryId: category.id,
        name: `${productPrefix} ${String(index + 1).padStart(4, '0')}`,
        barcode: `PERF-${suffix}-${String(index + 1).padStart(4, '0')}`,
        baseUnit: 'PCS',
        quantity: 0,
        cost: 5,
        price: 10,
        trackInventory: false,
        isAvailable: true,
        itemType: 'RESALE',
        vatType: 'VATABLE',
      })),
    });
    const terminal = await prisma.posTerminalInfo.create({
      data: {
        companyId: profiles.companyId,
        minNumber: `MIN-PERF-${suffix}`,
        accreditationNumber: `ACC-PERF-${suffix}`,
        ptuNumber: `PTU-PERF-${suffix}`,
        dateIssued: new Date('2024-01-01'),
        validUntil: new Date('2035-01-01'),
        posName: `E2E Performance Terminal ${suffix}`,
        registeredName: 'E2E Performance',
        operatedBy: 'E2E Performance',
        address: 'E2E Test Address',
        vatTinNumber: `TIN-PERF-${suffix}`,
        vat: 12,
        isActive: true,
        isDefaultTerminal: true,
      },
      select: { id: true },
    });
    terminalId = terminal.id;
    const timestamp = await prisma.timestamp.create({
      data: {
        posTerminalId: terminal.id,
        cashierId: manager.id,
        managerInId: manager.id,
        timestampIn: new Date(),
        cashInDrawerAmount: 1_000,
      },
      select: { id: true },
    });
    timestampId = timestamp.id;

    await authenticatePageWithCredentials(page, managerCredentials);
    let requestCount = 0;
    let transferredBytes = 0;
    const onResponse = async (response: import('@playwright/test').Response) => {
      requestCount += 1;
      const headerBytes = Number(response.headers()['content-length'] ?? 0);
      if (headerBytes > 0) transferredBytes += headerBytes;
    };
    page.on('response', onResponse);
    const interactiveStartedAt = Date.now();
    const bootstrapFinished = page.waitForResponse(
      (response) => response.url().includes('/api/sync/bootstrap') && response.ok(),
      { timeout: 60_000 },
    );
    await page.goto('/pos', { waitUntil: 'domcontentloaded' });
    const bootstrapResponse = await bootstrapFinished;
    const bootstrapBody = await bootstrapResponse.body();
    transferredBytes = Math.max(transferredBytes, bootstrapBody.byteLength);
    const search = page.getByPlaceholder('Search name, barcode, generic, brand...');
    await expect(search).toBeVisible({ timeout: 60_000 });
    const interactiveMs = Date.now() - interactiveStartedAt;
    page.off('response', onResponse);

    const targetName = `${productPrefix} 1000`;
    const searchMs = await page.evaluate(async (name) => {
      const input = document.querySelector<HTMLInputElement>(
        'input[placeholder="Search name, barcode, generic, brand..."]',
      );
      if (!input) throw new Error('POS search input was not found.');

      const rendered = () =>
        Array.from(document.querySelectorAll('h3')).some(
          (heading) => heading.textContent?.trim() === name,
        );
      const startedAt = performance.now();
      const renderedPromise = new Promise<void>((resolve, reject) => {
        if (rendered()) {
          resolve();
          return;
        }
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error('Filtered product did not render.'));
        }, 5_000);
        const observer = new MutationObserver(() => {
          if (!rendered()) return;
          window.clearTimeout(timeout);
          observer.disconnect();
          resolve();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set;
      valueSetter?.call(input, name);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await renderedPromise;
      return performance.now() - startedAt;
    }, targetName);
    const target = page.getByText(targetName, { exact: true }).first();
    await expect(target).toBeVisible();

    const addToCartMs = await page.evaluate(async (name) => {
      const productHeading = Array.from(document.querySelectorAll('h3')).find(
        (heading) => heading.textContent?.trim() === name,
      );
      const productCard = productHeading?.closest<HTMLElement>('.cursor-pointer');
      const cart = document.querySelector<HTMLElement>('[data-testid="pos-cart-items"]');
      if (!productCard || !cart) throw new Error('Product card or cart was not found.');

      const rendered = () => cart.textContent?.includes(name) === true;
      const startedAt = performance.now();
      const renderedPromise = new Promise<void>((resolve, reject) => {
        if (rendered()) {
          resolve();
          return;
        }
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error('Cart feedback did not render.'));
        }, 5_000);
        const observer = new MutationObserver(() => {
          if (!rendered()) return;
          window.clearTimeout(timeout);
          observer.disconnect();
          resolve();
        });
        observer.observe(cart, { childList: true, subtree: true, characterData: true });
      });
      productCard.click();
      await renderedPromise;
      return performance.now() - startedAt;
    }, targetName);
    await expect(page.getByTestId('pos-cart-items')).toContainText(targetName);

    const heapBefore = await page.evaluate(() => {
      const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory;
      return memory?.usedJSHeapSize ?? null;
    });
    const saleTimesMs: number[] = [];
    for (let sale = 0; sale < 20; sale += 1) {
      if (sale > 0) {
        await search.fill(targetName);
        await page.getByText(targetName, { exact: true }).first().click();
        await expect(page.getByTestId('pos-cart-items')).toContainText(targetName);
      }
      await page.getByRole('button', { name: 'Checkout', exact: true }).click();
      await page.getByRole('button', { name: 'Exact' }).click();
      const checkoutStartedAt = await page.evaluate(() => performance.now());
      await page.getByRole('button', { name: 'Complete Sale' }).click();
      await expect(page.getByText('Transaction Done')).toBeVisible({ timeout: 15_000 });
      saleTimesMs.push(
        await page.evaluate((startedAt) => performance.now() - startedAt, checkoutStartedAt),
      );
      if (sale < 19) {
        await page.getByRole('button', { name: /New Checkout/i }).click();
        await expect(page.getByTestId('pos-shell')).toBeVisible();
      }
    }
    const heapAfter = await page.evaluate(() => {
      const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory;
      return memory?.usedJSHeapSize ?? null;
    });
    const domNodeCount = await page.locator('*').count();

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const database = await new Promise<IDBDatabase>((resolve, reject) => {
              const request = indexedDB.open('posard-offline-pos');
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            try {
              return await new Promise<number>((resolve, reject) => {
                const transaction = database.transaction('queuedActions', 'readonly');
                const request = transaction.objectStore('queuedActions').getAll();
                request.onsuccess = () =>
                  resolve(
                    request.result.filter((action) => action.syncStatus !== 'synced').length,
                  );
                request.onerror = () => reject(request.error);
              });
            } finally {
              database.close();
            }
          }),
        { message: 'offline checkout queue to finish syncing', timeout: 240_000 },
      )
      .toBe(0);
    const queuedActions = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('posard-offline-pos');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        return await new Promise<Array<{
          localId: string;
          idempotencyKey: string;
          syncStatus: string;
          retryCount?: number;
          nextRetryAt?: string | null;
          lastError?: string | null;
        }>>((resolve, reject) => {
          const transaction = database.transaction('queuedActions', 'readonly');
          const request = transaction.objectStore('queuedActions').getAll();
          request.onsuccess = () =>
            resolve(
              request.result.map((action) => ({
                localId: action.localId,
                idempotencyKey: action.idempotencyKey,
                syncStatus: action.syncStatus,
                retryCount: action.retryCount,
                nextRetryAt: action.nextRetryAt,
                lastError: action.lastError,
              })),
            );
          request.onerror = () => reject(request.error);
        });
      } finally {
        database.close();
      }
    });
    await test.info().attach('pos-volume-queue.json', {
      body: Buffer.from(JSON.stringify(queuedActions, null, 2)),
      contentType: 'application/json',
    });

    const performanceMetrics = {
      productCount: 1_000,
      interactiveMs,
      searchMs,
      addToCartMs,
      saleTimesMs,
      requestCount,
      transferredBytes,
      domNodeCount,
      heapBefore,
      heapAfter,
    };
    await test.info().attach('pos-volume-performance.json', {
      body: Buffer.from(JSON.stringify(performanceMetrics, null, 2)),
      contentType: 'application/json',
    });
    console.info(`POS_VOLUME_PERFORMANCE ${JSON.stringify(performanceMetrics)}`);

    expect(queuedActions.filter((action) => action.syncStatus !== 'synced')).toEqual([]);
    expect(
      await prisma.invoice.count({ where: { posTerminalId: terminal.id } }),
    ).toBe(20);
    const productionServer =
      process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.includes('npm run start') === true;
    expect(interactiveMs, '1,000-product POS interactivity').toBeLessThanOrEqual(
      productionServer ? 15_000 : 30_000,
    );
    expect(searchMs, 'settled product search').toBeLessThanOrEqual(300);
    expect(addToCartMs, 'add-to-cart feedback').toBeLessThanOrEqual(150);
    expect(Math.max(...saleTimesMs), 'local checkout submission').toBeLessThanOrEqual(2_000);
    expect(saleTimesMs.at(-1)!, 'last checkout degradation').toBeLessThanOrEqual(
      Math.max(2_000, saleTimesMs[0] * 2),
    );
    expect(requestCount, 'POS bootstrap request count').toBeLessThan(100);
    expect(transferredBytes, 'POS bootstrap transferred bytes').toBeLessThan(10 * 1024 * 1024);
    expect(domNodeCount, 'post-loop DOM nodes').toBeLessThan(10_000);
    if (heapBefore !== null && heapAfter !== null) {
      expect(heapAfter - heapBefore, '20-sale JS heap growth').toBeLessThan(50 * 1024 * 1024);
    }

  } finally {
    await prisma.auditLog.deleteMany({ where: { companyId: profiles.companyId } });
    await prisma.stockMovement.deleteMany({ where: { companyId: profiles.companyId } });
    if (terminalId) {
      await prisma.invoice.deleteMany({ where: { posTerminalId: terminalId } });
    }
    if (timestampId) await prisma.timestamp.deleteMany({ where: { id: timestampId } });
    await prisma.product.deleteMany({
      where: { companyId: profiles.companyId, name: { startsWith: `E2E PERF PRODUCT ${suffix}` } },
    });
    if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } });
    if (terminalId) await prisma.posTerminalInfo.deleteMany({ where: { id: terminalId } });
    if (authUser) await authUser.cleanup();
    await profiles.cleanup();
  }
});
