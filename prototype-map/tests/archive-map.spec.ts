import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const publicRoot = path.resolve("public/datasets");
const pointer = JSON.parse(readFileSync(path.join(publicRoot, "current.json"), "utf8"));
const manifestPath = path.join(publicRoot, pointer.manifest);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const arts = JSON.parse(readFileSync(path.join(path.dirname(manifestPath), manifest.modes.arts.records), "utf8"));
const first = arts[0];
const secondIndex = arts.slice(0, 100).findIndex((record: { detail_shard: string }) => record.detail_shard !== first.detail_shard);
const second = arts[secondIndex];

test.beforeEach(async ({ page }) => {
  // External background tiles are independent of archive search and detail data.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
  }));
  await page.route("https://demotiles.maplibre.org/**", route => route.abort());
});

async function waitForRecords(page: Page, count: number) {
  await expect(page.locator(".result-heading strong")).toHaveText(`${count.toLocaleString("ja-JP")}件`);
  await expect(page.locator(".result-list button").first()).toBeVisible();
}

test("three modes support selection, search reset, and no-result states", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/");
  for (const mode of [
    { label: "芸能・文化財", id: "arts" },
    { label: "公演・映像", id: "events" },
    { label: "保存会・団体", id: "organizations" },
  ]) {
    await page.locator(".mode-tabs button").filter({ hasText: mode.label }).click();
    await waitForRecords(page, manifest.modes[mode.id].record_count);
    const title = await page.locator(".result-list button strong").first().textContent();
    await page.locator(".result-list button").first().click();
    await expect(page.locator(".detail-panel h2")).toHaveText(title!);
    await expect(page.getByText("詳細を読み込み中...", { exact: true })).toBeHidden();
    await page.locator(".detail-close").click();
    await page.getByRole("searchbox").fill("存在しない検索語_ZZ_20261014");
    await expect(page.getByText("条件に一致するレコードがない。", { exact: true })).toBeVisible();
    await page.getByRole("searchbox").fill("");
    await waitForRecords(page, manifest.modes[mode.id].record_count);
    await expect(page.locator(".control-panel")).not.toContainText("出張計画");
  }
  expect(pageErrors).toEqual([]);
});

test("event-series parent and child details navigate both ways", async ({ page }) => {
  await page.goto("/");
  await page.locator(".mode-tabs button").filter({ hasText: "公演・映像" }).click();
  await waitForRecords(page, manifest.modes.events.record_count);
  await page.getByRole("searchbox").fill("北上・みちのく芸能まつり");
  await page.locator("label").filter({ hasText: "収録種別" }).locator("select").selectOption("event_series");
  await page.locator(".result-list button").first().click();
  await expect(page.locator(".series-links button").first()).toBeVisible();
  const parentTitle = await page.locator(".detail-panel h2").textContent();
  await page.locator(".series-links button").first().click();
  await page.getByRole("button", { name: /親シリーズ/ }).click();
  await expect(page.locator(".detail-panel h2")).toHaveText(parentTitle!);
});

for (const action of ["new-selection", "close", "switch-mode"]) {
  test(`late detail response is ignored after ${action}`, async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    let requested!: () => void;
    const started = new Promise<void>(resolve => { requested = resolve; });
    await page.route("**/details/arts/*.json", async route => {
      const response = await route.fetch();
      const data = await response.json();
      if (route.request().url().endsWith(`/${first.detail_shard}.json`)) {
        data[first.detail_id].summary = "OBSOLETE_DETAIL";
        requested();
        await gate;
      } else if (data[second.detail_id]) {
        data[second.detail_id].summary = "CURRENT_DETAIL";
      }
      await route.fulfill({ response, json: data });
    });
    await page.goto("/");
    await waitForRecords(page, manifest.modes.arts.record_count);
    await page.locator(".result-list button").first().click();
    await started;
    if (action === "new-selection") {
      await page.locator(".result-list button").nth(secondIndex).click();
      await expect(page.getByText("CURRENT_DETAIL", { exact: true })).toBeVisible();
    } else if (action === "close") {
      await page.locator(".detail-close").click();
    } else {
      await page.locator(".mode-tabs button").filter({ hasText: "公演・映像" }).click();
      await waitForRecords(page, manifest.modes.events.record_count);
      await page.locator(".result-list button").first().click();
      await expect(page.getByText("詳細を読み込み中...", { exact: true })).toBeHidden();
    }
    const finished = page.waitForResponse(response => response.url().endsWith(`/details/arts/${first.detail_shard}.json`));
    release();
    await finished;
    await page.waitForTimeout(100);
    await expect(page.locator(".detail-panel")).not.toContainText("OBSOLETE_DETAIL");
    if (action === "new-selection") await expect(page.getByText("CURRENT_DETAIL", { exact: true })).toBeVisible();
    if (action === "close") await expect(page.locator(".detail-panel h2")).toHaveText("初期収録データ");
  });
}
