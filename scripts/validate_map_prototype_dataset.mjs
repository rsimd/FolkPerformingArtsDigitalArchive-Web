import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const publicRoot = path.join(projectRoot, "prototype-map", "public", "datasets");

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\p{P}\p{S}\s]/gu, "");
}

function externalEventSourceUrl(sourceUrls) {
  for (const sourceUrl of sourceUrls ?? []) {
    try {
      const parsed = new URL(sourceUrl);
      if (
        /(^|\.)youtube\.com$/i.test(parsed.hostname) ||
        /(^|\.)youtu\.be$/i.test(parsed.hostname)
      ) {
        continue;
      }
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "").toLocaleLowerCase("ja");
    } catch {
      continue;
    }
  }
  return null;
}

const pointer = await readJson(path.join(publicRoot, "current.json"));
const manifestPath = path.join(publicRoot, pointer.manifest);
const manifest = await readJson(manifestPath);
const datasetRoot = path.dirname(manifestPath);
const summary = {};

for (const [mode, modeManifest] of Object.entries(manifest.modes)) {
  const [collection, records] = await Promise.all([
    readJson(path.join(datasetRoot, modeManifest.geojson)),
    readJson(path.join(datasetRoot, modeManifest.records)),
  ]);

  assert(collection.type === "FeatureCollection", `${mode}: invalid GeoJSON`);
  assert(Array.isArray(records), `${mode}: records must be an array`);
  assert(
    records.length === modeManifest.record_count,
    `${mode}: record count mismatch`,
  );
  assert(
    collection.features.length === modeManifest.feature_count,
    `${mode}: feature count mismatch`,
  );
  assert(
    modeManifest.unmapped_count +
      (modeManifest.conceptual_count ?? 0) ===
      modeManifest.record_count - modeManifest.feature_count,
    `${mode}: non-map count mismatch`,
  );

  const recordIds = new Set();
  const detailIds = new Set();
  const detailShards = new Set();
  let mappedRecordCount = 0;

  for (const record of records) {
    assert(record.mode === mode, `${mode}: record mode mismatch`);
    assert(record.entity_id, `${mode}: entity_id is required`);
    assert(record.detail_id, `${mode}: detail_id is required`);
    assert(record.detail_shard, `${mode}: detail_shard is required`);
    assert(record.title, `${mode}: title is required`);
    assert(
      !recordIds.has(record.entity_id),
      `${mode}: duplicate entity_id ${record.entity_id}`,
    );
    recordIds.add(record.entity_id);
    detailIds.add(record.detail_id);
    detailShards.add(record.detail_shard);

    if (record.coordinates !== null) {
      assert(
        Array.isArray(record.coordinates) &&
          record.coordinates.length === 2 &&
          record.coordinates.every(Number.isFinite),
        `${mode}: invalid record coordinates ${record.entity_id}`,
      );
      mappedRecordCount += 1;
    } else {
      assert(
        ["unmapped", "conceptual"].includes(record.location_precision),
        `${mode}: unmapped record has mapped precision ${record.entity_id}`,
      );
      if (record.location_precision === "conceptual") {
        assert(
          mode === "events" && record.record_type === "event_series",
          `${mode}: conceptual record must be an event series`,
        );
      }
    }
  }

  assert(
    mappedRecordCount === modeManifest.feature_count,
    `${mode}: mapped record count mismatch`,
  );

  const featureIds = new Set();
  for (const item of collection.features) {
    const { properties, geometry } = item;
    assert(geometry?.type === "Point", `${mode}: geometry must be Point`);
    assert(
      Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length === 2 &&
        geometry.coordinates.every(Number.isFinite),
      `${mode}: invalid feature coordinates`,
    );
    assert(properties.mode === mode, `${mode}: feature mode mismatch`);
    assert(
      properties.record_type !== "event_series",
      "events: event series must not be emitted as a map feature",
    );
    assert(
      recordIds.has(properties.entity_id),
      `${mode}: feature has no record ${properties.entity_id}`,
    );
    assert(
      !featureIds.has(properties.entity_id),
      `${mode}: duplicate feature ${properties.entity_id}`,
    );
    featureIds.add(properties.entity_id);
  }

  const detailObjects = await Promise.all(
    [...detailShards].map((shard) =>
      readJson(
        path.join(
          datasetRoot,
          modeManifest.details.replace("{shard}", shard),
        ),
      ),
    ),
  );
  const availableDetails = new Map(
    detailObjects.flatMap((details) => Object.entries(details)),
  );
  const availableDetailIds = new Set(availableDetails.keys());
  for (const detailId of detailIds) {
    assert(
      availableDetailIds.has(detailId),
      `${mode}: missing detail ${detailId}`,
    );
  }
  assert(
    availableDetailIds.size === records.length,
    `${mode}: detail count mismatch`,
  );

  if (mode === "events") {
    const eventIdentities = new Set();
    const eventSourceIdentities = new Set();
    const recordsById = new Map(
      records.map((record) => [record.entity_id, record]),
    );
    const linkedChildIds = new Set();
    const seriesRecords = records.filter(
      (record) => record.record_type === "event_series",
    );
    let structuredEventCount = 0;
    for (const record of records) {
      if (record.record_type !== "video_event") continue;
      structuredEventCount += 1;
      const detail = availableDetails.get(record.detail_id);
      const sourceUrl = externalEventSourceUrl(detail?.source_urls);
      if (sourceUrl && record.held_date) {
        const sourceIdentity = [
          normalizeIdentity(record.title),
          String(record.held_date).slice(0, 4),
          sourceUrl,
        ].join("|");
        assert(
          !eventSourceIdentities.has(sourceIdentity),
          `events: duplicate source-linked event ${sourceIdentity}`,
        );
        eventSourceIdentities.add(sourceIdentity);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.held_date ?? "")) continue;
      const scope =
        normalizeIdentity(record.municipality) ||
        normalizeIdentity(detail?.channel) ||
        normalizeIdentity(detail?.venue) ||
        normalizeIdentity(record.prefecture);
      if (!scope) continue;
      const identity = [
        normalizeIdentity(record.title),
        record.held_date,
        scope,
      ].join("|");
      assert(
        !eventIdentities.has(identity),
        `events: duplicate structured event ${identity}`,
      );
      eventIdentities.add(identity);
    }
    const structuredManifestCount = modeManifest.breakdown.find(
      (item) => item.label === "構造化イベント",
    )?.count;
    assert(
      structuredEventCount === structuredManifestCount,
      "events: structured event breakdown mismatch",
    );
    const seriesManifestCount = modeManifest.breakdown.find(
      (item) => item.label === "イベントシリーズ",
    )?.count;
    assert(
      seriesRecords.length === seriesManifestCount,
      "events: event series breakdown mismatch",
    );
    assert(
      seriesRecords.length === (modeManifest.conceptual_count ?? 0),
      "events: every conceptual record must be an event series",
    );

    for (const series of seriesRecords) {
      const detail = availableDetails.get(series.detail_id);
      const childIds = series.child_event_ids;
      assert(
        Array.isArray(childIds) && childIds.length >= 2,
        `events: series must have at least two children ${series.entity_id}`,
      );
      assert(
        new Set(childIds).size === childIds.length,
        `events: duplicate child within series ${series.entity_id}`,
      );
      assert(
        JSON.stringify(childIds) === JSON.stringify(detail?.child_event_ids),
        `events: series record/detail children mismatch ${series.entity_id}`,
      );
      assert(
        series.child_event_count === childIds.length &&
          detail?.occurrence_count === childIds.length,
        `events: series occurrence count mismatch ${series.entity_id}`,
      );
      const childSummaries = Array.isArray(detail?.children)
        ? detail.children
        : [];
      assert(
        childSummaries.length === childIds.length,
        `events: series child summary count mismatch ${series.entity_id}`,
      );
      assert(
        JSON.stringify(
          childSummaries.map((child) => child.entity_id),
        ) === JSON.stringify(childIds),
        `events: series child summary IDs mismatch ${series.entity_id}`,
      );
      const editionNumbers = new Set();
      for (const childId of childIds) {
        assert(
          !linkedChildIds.has(childId),
          `events: child belongs to multiple series ${childId}`,
        );
        linkedChildIds.add(childId);
        const child = recordsById.get(childId);
        assert(child, `events: orphan series child ${childId}`);
        assert(
          child.record_type === "video_event",
          `events: series child is not a video event ${childId}`,
        );
        assert(
          child.parent_series_id === series.entity_id,
          `events: child parent mismatch ${childId}`,
        );
        const childDetail = availableDetails.get(child.detail_id);
        assert(
          childDetail?.parent_series_id === series.entity_id &&
            childDetail?.series_title === series.title,
          `events: child detail parent mismatch ${childId}`,
        );
        if (Number.isInteger(child.series_edition_number)) {
          assert(
            !editionNumbers.has(child.series_edition_number),
            `events: duplicate edition in series ${series.entity_id}`,
          );
          editionNumbers.add(child.series_edition_number);
        }
      }
    }
    for (const record of records) {
      if (!record.parent_series_id) continue;
      assert(
        linkedChildIds.has(record.entity_id) &&
          recordsById.has(record.parent_series_id),
        `events: orphan parent reference ${record.entity_id}`,
      );
    }

    const audit = manifest.event_series_audit;
    assert(audit, "events: event series audit is required");
    assert(
      audit.parent_count === seriesRecords.length &&
        audit.child_count === linkedChildIds.size,
      "events: event series audit counts mismatch",
    );
    const kitakamiCheck =
      audit.named_checks?.kitakami_michinoku_geino_matsuri;
    const kitakamiSeries = seriesRecords.find(
      (record) =>
        normalizeIdentity(record.title) ===
        normalizeIdentity("北上・みちのく芸能まつり"),
    );
    assert(kitakamiSeries, "events: Kitakami series is missing");
    assert(
      JSON.stringify(kitakamiSeries.edition_numbers) ===
        JSON.stringify([61, 62, 64]),
      "events: Kitakami observed editions must be 61, 62, and 64",
    );
    assert(
      JSON.stringify(kitakamiCheck?.missing_editions) ===
        JSON.stringify([63]) &&
        kitakamiCheck?.edition_63_status === "not_present_in_source",
      "events: missing 63rd Kitakami edition audit is invalid",
    );
    const specialPerformance = records.find((record) =>
      String(record.title).includes(
        "北上・みちのく芸能まつり特別公演～第60回に向けて～",
      ),
    );
    assert(
      specialPerformance && !specialPerformance.parent_series_id,
      "events: 60th-edition special performance must remain outside the series",
    );
  }

  summary[mode] = {
    records: records.length,
    features: collection.features.length,
    unmapped: modeManifest.unmapped_count,
    conceptual: modeManifest.conceptual_count ?? 0,
    details: availableDetailIds.size,
    detail_shards: detailShards.size,
  };
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: "ok",
      dataset_version: manifest.dataset_version,
      summary,
    },
    null,
    2,
  )}\n`,
);
