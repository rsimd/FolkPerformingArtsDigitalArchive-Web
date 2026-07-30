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
    modeManifest.unmapped_count ===
      modeManifest.record_count - modeManifest.feature_count,
    `${mode}: unmapped count mismatch`,
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
        record.location_precision === "unmapped",
        `${mode}: unmapped record has mapped precision ${record.entity_id}`,
      );
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
  const availableDetailIds = new Set(
    detailObjects.flatMap((details) => Object.keys(details)),
  );
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

  summary[mode] = {
    records: records.length,
    features: collection.features.length,
    unmapped: modeManifest.unmapped_count,
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
