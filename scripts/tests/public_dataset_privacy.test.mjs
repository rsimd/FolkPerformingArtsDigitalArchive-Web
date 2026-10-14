import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicDetail } from "../public_dataset_privacy.mjs";

test("public provenance and source fields remain available", () => {
  assert.doesNotThrow(() => assertPublicDetail("events/video_public", {
    source_workbook: "public_folk_arts_catalog.xlsx",
    source_fields: { 名称: "公開公演", 開催日: "2026-07-30" },
  }));
});

test("private calendar and fieldwork IDs are rejected", () => {
  for (const id of ["events/calendar_123", "events/fieldwork_123"]) {
    assert.throws(() => assertPublicDetail(id, {}), /private reference detail/);
  }
});

test("a private record type is rejected even under a public-looking ID", () => {
  assert.throws(() => assertPublicDetail("events/video_public", {
    record_type: "fieldwork_interview",
  }), /private reference detail type/);
});

test("internal workbook provenance is rejected within nested source fields", () => {
  for (const workbook of ["出張計画.xlsx", "iwagei_michinoku_geino_calendar_2000-2026.xlsx"]) {
    assert.throws(() => assertPublicDetail("events/video_public", {
      source_fields: { 原資料: { ファイル: workbook } },
    }), /internal source workbook/);
  }
});
