import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const datasetVersion = "2026-07-30-full";
const datasetRoot = path.join(
  projectRoot,
  "prototype-map",
  "public",
  "datasets",
  datasetVersion,
);
const extractorPath = path.join(
  projectRoot,
  "scripts",
  "extract_map_excel_source.mjs",
);

const sourcePaths = {
  events:
    "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/three_channels_youtube_event_catalog_2026-07-29_expanded_update_duration_shorts.xlsx",
  videos:
    "outputs/019fac96-97d3-77a1-85fe-e3e3115bb409/youtube_folk_performing_arts_channels_2026-07-29_expanded.xlsx",
  tohoku:
    "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/tohokubuneiken_folk_arts_catalog_2026-07-29.xlsx",
  calendar:
    "outputs/019fac8b-45c8-7c21-aca3-2d8a1fcc816e/iwagei_michinoku_geino_calendar_2000-2026_2026-07-29.xlsx",
  fieldwork: "出張計画.xlsx",
};

const supersededSources = [
  {
    path: "outputs/019fac4e-102e-7741-866d-1456a80c64ce/youtube_folk_performing_arts_channels_2026-07-29.xlsx",
    replaced_by: sourcePaths.videos,
  },
  {
    path: "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/three_channels_youtube_event_catalog_2026-07-29.xlsx",
    replaced_by: sourcePaths.events,
  },
  {
    path: "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/three_channels_youtube_event_catalog_2026-07-29_expanded_update.xlsx",
    replaced_by: sourcePaths.events,
  },
  {
    path: "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/tohokubuneiken_youtube_event_catalog_2026-07-29.xlsx",
    replaced_by: sourcePaths.tohoku,
  },
  {
    path: "work/019fac2a-519f-7d00-bbd1-4f8829e0039b/superseded_non_api/output/tohokubuneiken_youtube_event_catalog_2026-07-29.xlsx",
    replaced_by: sourcePaths.tohoku,
  },
  {
    path: "work/excel_update_2026-07-30/original_before_video_append.xlsx",
    replaced_by: sourcePaths.events,
  },
];

const prefectures = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const prefectureByCode = new Map(
  prefectures.map((prefecture, index) => [
    String(index + 1).padStart(2, "0"),
    prefecture,
  ]),
);

function parseJsonl(text) {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function rowsToObjects(values) {
  const [headers, ...rows] = values;
  return rows
    .filter((row) => row.some((value) => value !== null && value !== ""))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [String(header), row[index] ?? null]),
      ),
    );
}

function hashId(prefix, value) {
  return `${prefix}_${createHash("sha1")
    .update(String(value))
    .digest("hex")
    .slice(0, 16)}`;
}

function detailShard(detailId) {
  return createHash("sha1").update(detailId).digest("hex").slice(0, 2);
}

function averageCoordinates(points) {
  if (points.length === 0) return null;
  const [longitude, latitude] = points.reduce(
    ([longitudeSum, latitudeSum], [longitude, latitude]) => [
      longitudeSum + longitude,
      latitudeSum + latitude,
    ],
    [0, 0],
  );
  return [longitude / points.length, latitude / points.length];
}

function splitValues(value) {
  if (!value) return [];
  return String(value)
    .split(/\s*(?:\/|\||\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitUrls(value) {
  if (!value) return [];
  return String(value)
    .split(/\s*(?:\||\n)\s*/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//.test(item));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function excelDateToIso(value) {
  if (typeof value !== "number") return value ? String(value) : null;
  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + Math.floor(value) * 86400000)
    .toISOString()
    .slice(0, 10);
}

function findPrefecture(value) {
  const text = String(value ?? "");
  const matches = prefectures.filter((prefecture) => text.includes(prefecture));
  return matches.length === 1 ? matches[0] : null;
}

function findMunicipality(value) {
  const text = String(value ?? "");
  const matches = text.match(
    /[\p{Script=Han}々ヶケノの・]{1,12}(?:市|区|町|村)/gu,
  );
  if (!matches) return null;
  return matches
    .map((match) => match.replace(/^.*[都道府県]/, ""))
    .sort((a, b) => a.length - b.length)[0];
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("ja")
    .replace(/[\s・、。「」『』（）()【】\-–—]/g, "");
}

function readValue(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== null && row[key] !== undefined && row[key] !== "") {
      return row[key];
    }
  }
  return null;
}

function makeRecord(properties, location) {
  const detailId = properties.detail_id;
  return {
    ...properties,
    detail_shard: detailShard(detailId),
    location_precision: location?.precision ?? "unmapped",
    coordinates: location?.coordinates ?? null,
  };
}

function recordToFeature(record) {
  const { coordinates, search_text: _searchText, ...properties } = record;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties,
  };
}

function featureCollection(records) {
  return {
    type: "FeatureCollection",
    features: records
      .filter((record) => Array.isArray(record.coordinates))
      .map(recordToFeature),
  };
}

function buildLocationIndex(rawRecords) {
  const municipalityPoints = new Map();
  const prefecturePoints = new Map();

  for (const record of rawRecords) {
    const coordinates = record.geometry?.coordinates;
    const prefecture = prefectureByCode.get(
      String(record.pref_code ?? "").padStart(2, "0"),
    );
    if (
      !prefecture ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      continue;
    }

    const municipality = String(record.location ?? "").trim();
    const municipalityKey = `${prefecture}|${municipality}`;
    if (!municipalityPoints.has(municipalityKey)) {
      municipalityPoints.set(municipalityKey, []);
    }
    municipalityPoints.get(municipalityKey).push(coordinates);

    if (!prefecturePoints.has(prefecture)) {
      prefecturePoints.set(prefecture, []);
    }
    prefecturePoints.get(prefecture).push(coordinates);
  }

  const municipalityCenters = new Map(
    [...municipalityPoints].map(([key, points]) => [
      key,
      averageCoordinates(points),
    ]),
  );
  const prefectureCenters = new Map(
    [...prefecturePoints].map(([key, points]) => [
      key,
      averageCoordinates(points),
    ]),
  );

  return {
    municipalityCenters,
    prefectureCenters,
    resolve(prefecture, municipality) {
      if (prefecture && municipality) {
        const exact = municipalityCenters.get(
          `${prefecture}|${municipality}`,
        );
        if (exact) {
          return {
            coordinates: exact,
            precision: "municipality_centroid",
          };
        }
        const candidates = [...municipalityCenters.entries()].filter(
          ([key]) =>
            key.startsWith(`${prefecture}|`) &&
            (key.includes(municipality) || municipality.includes(key.split("|")[1])),
        );
        if (candidates.length > 0) {
          return {
            coordinates: averageCoordinates(
              candidates.map(([, coordinates]) => coordinates),
            ),
            precision: "municipality_centroid",
          };
        }
      }

      if (prefecture && prefectureCenters.has(prefecture)) {
        return {
          coordinates: prefectureCenters.get(prefecture),
          precision: "prefecture_centroid",
        };
      }
      return null;
    },
    inferPrefecture(municipality) {
      if (!municipality) return null;
      const matches = [...municipalityCenters.keys()]
        .filter((key) => {
          const candidate = key.split("|")[1];
          return (
            candidate === municipality ||
            candidate.includes(municipality) ||
            municipality.includes(candidate)
          );
        })
        .map((key) => key.split("|")[0]);
      return new Set(matches).size === 1 ? matches[0] : null;
    },
  };
}

function resolveTextLocation(locationIndex, explicitPrefecture, explicitMunicipality, text) {
  const municipality =
    explicitMunicipality || findMunicipality(text) || null;
  const prefecture =
    findPrefecture(explicitPrefecture) ||
    findPrefecture(text) ||
    locationIndex.inferPrefecture(municipality);
  return {
    prefecture: prefecture ?? null,
    municipality,
    location: locationIndex.resolve(prefecture, municipality),
  };
}

function buildArts(rawRecords, arts, designations) {
  const rawByRecno = new Map(
    rawRecords
      .filter((record) => record.recno !== null)
      .map((record) => [String(record.recno), record]),
  );
  const designationGroups = new Map();

  for (const designation of designations) {
    if (!designationGroups.has(designation.art_id)) {
      designationGroups.set(designation.art_id, []);
    }
    designationGroups.get(designation.art_id).push(designation);
  }

  const records = [];
  const details = new Map();

  for (const art of arts) {
    const artId = art.art_id;
    const artDesignations = designationGroups.get(artId) ?? [];
    const recnos = new Set(
      artDesignations.flatMap((designation) =>
        String(designation.notes ?? "").match(/\b\d{8}\b/g) ?? [],
      ),
    );
    const sourcePoints = [...recnos]
      .map((recno) => rawByRecno.get(recno)?.geometry?.coordinates)
      .filter(Boolean);
    const primary = artDesignations[0] ?? null;
    const artLocation = art.locations?.[0] ?? {};
    const detailId = `arts/${artId}`;
    const location =
      sourcePoints.length > 0
        ? {
            coordinates: averageCoordinates(sourcePoints),
            precision:
              sourcePoints.length === 1
                ? "source_point"
                : "source_points_centroid",
          }
        : null;

    const record = makeRecord(
      {
        entity_id: artId,
        detail_id: detailId,
        mode: "arts",
        record_type: "performing_art",
        evidence_layer: "official",
        title: art.official_name,
        prefecture: artLocation.prefecture_name ?? null,
        municipality: artLocation.municipality_name ?? null,
        category: primary?.official_category_2_id ?? "not_stated",
        verification_status:
          primary?.verification_status_id ?? "unknown",
        designation_count: artDesignations.length,
        search_text: [
          art.official_name,
          ...(art.aliases ?? []),
          ...(art.archive_genre_ids ?? []),
        ].join(" "),
      },
      location,
    );
    records.push(record);
    details.set(detailId, {
      title: art.official_name,
      summary: art.summary,
      aliases: art.aliases ?? [],
      locations: art.locations ?? [],
      archive_genre_ids: art.archive_genre_ids ?? [],
      designations: artDesignations.map((designation) => ({
        type: designation.cultural_property_type,
        jurisdiction: designation.jurisdiction_level_id,
        authority: designation.authority_name,
        date: designation.designation_date,
        source_title: designation.source?.title,
        source_url: designation.source?.url,
      })),
      source_fields: art,
      source_workbook: "data/cultural_properties/performing_arts.jsonl",
    });
  }

  return { records, details };
}

function videoSupplementIndex(eventStructuredRows, tohokuStructuredRows) {
  const supplements = new Map();

  function add(rows, sourceWorkbook) {
    for (const row of rows) {
      const videoId = String(readValue(row, "video_id") ?? "");
      if (!videoId) continue;
      if (!supplements.has(videoId)) supplements.set(videoId, []);
      supplements.get(videoId).push({ source_workbook: sourceWorkbook, fields: row });
    }
  }

  add(eventStructuredRows, sourcePaths.events);
  add(tohokuStructuredRows, sourcePaths.tohoku);
  return supplements;
}

function buildVideoRecord(row, supplementalRows, locationIndex, sourceWorkbook) {
  const videoId = String(readValue(row, "video_id") ?? "");
  const fallbackFields = supplementalRows.map((item) => item.fields);
  const prefecture = readValue(
    row,
    "都道府県",
  ) ?? fallbackFields.map((item) => readValue(item, "都道府県")).find(Boolean);
  const municipality = readValue(
    row,
    "市区町村",
  ) ?? fallbackFields.map((item) => readValue(item, "市区町村")).find(Boolean);
  const title = String(readValue(row, "タイトル", "title") ?? "名称未確認");
  const channel = readValue(row, "チャンネル名");
  const artNames = readValue(row, "芸能名");
  const resolved = resolveTextLocation(
    locationIndex,
    prefecture ? String(prefecture) : null,
    municipality ? String(municipality) : null,
    [title, artNames].filter(Boolean).join(" "),
  );
  const detailId = `events/video_${videoId}`;
  const videoUrl = readValue(row, "動画URL", "video_url");
  const sourceUrls = uniqueValues([
    ...splitUrls(readValue(row, "出典URL", "source_urls")),
    ...splitUrls(videoUrl),
    ...supplementalRows.flatMap((item) =>
      splitUrls(readValue(item.fields, "根拠URL", "source_urls", "動画URL", "video_url")),
    ),
  ]);

  return {
    record: makeRecord(
      {
        entity_id: `video_${videoId}`,
        detail_id: detailId,
        mode: "events",
        record_type: "video",
        evidence_layer: "research",
        title,
        prefecture: resolved.prefecture,
        municipality: resolved.municipality,
        category: "video",
        verification_status: String(
          readValue(row, "review_status", "確信度", "選別 要確認") ?? "research",
        ),
        held_date: excelDateToIso(
          readValue(row, "公開日時", "published_at（撮影日ではない）", "published_at（公開日時UTC）"),
        ),
        video_count: 1,
        search_text: [title, channel, artNames].filter(Boolean).join(" "),
      },
      resolved.location,
    ),
    detail: {
      title,
      held_date: excelDateToIso(
        readValue(row, "公開日時", "published_at（撮影日ではない）", "published_at（公開日時UTC）"),
      ),
      prefecture: resolved.prefecture,
      municipality: resolved.municipality,
      channel,
      folk_art_names: splitValues(artNames),
      video_id: videoId,
      video_url: videoUrl,
      source_urls: sourceUrls,
      source_workbook: sourceWorkbook,
      source_fields: row,
      supplemental_sources: supplementalRows,
    },
  };
}

function eventIdentity(row) {
  return [
    normalizeIdentity(readValue(row, "イベント名")),
    normalizeIdentity(readValue(row, "開催日")),
    normalizeIdentity(readValue(row, "都道府県")),
    normalizeIdentity(readValue(row, "市区町村")),
    normalizeIdentity(readValue(row, "会場")),
  ].join("|");
}

function eventGroupValues(row) {
  return {
    videoIds: splitValues(readValue(row, "video_id一覧", "video_ids")),
    sourceUrls: splitUrls(readValue(row, "根拠URL", "source_urls")),
    performingGroups: splitValues(readValue(row, "出演団体")),
    preservationGroups: splitValues(readValue(row, "保存団体")),
    artNames: splitValues(readValue(row, "芸能名")),
    programNames: splitValues(readValue(row, "演目名")),
  };
}

function buildEventGroupRecord(row, locationIndex, sourceWorkbook, idPrefix) {
  const entityId = `${idPrefix}_${String(readValue(row, "event_id") ?? hashId("row", eventIdentity(row)))}`;
  const detailId = `events/${entityId}`;
  const title = String(readValue(row, "イベント名") ?? "名称未確認");
  const prefecture = readValue(row, "都道府県");
  const municipality = readValue(row, "市区町村");
  const venue = readValue(row, "会場");
  const values = eventGroupValues(row);
  const resolved = resolveTextLocation(
    locationIndex,
    prefecture ? String(prefecture) : null,
    municipality ? String(municipality) : null,
    [venue, title].filter(Boolean).join(" "),
  );
  const heldDate = excelDateToIso(readValue(row, "開催日"));

  return {
    record: makeRecord(
      {
        entity_id: entityId,
        detail_id: detailId,
        mode: "events",
        record_type: "video_event",
        evidence_layer: "research",
        title,
        prefecture: resolved.prefecture,
        municipality: resolved.municipality,
        category: "video_event",
        verification_status:
          values.sourceUrls.length > 0 ? "source_linked" : "needs_review",
        held_date: heldDate,
        video_count: Number(readValue(row, "動画数") ?? values.videoIds.length),
        search_text: [
          title,
          venue,
          ...values.performingGroups,
          ...values.preservationGroups,
          ...values.artNames,
        ]
          .filter(Boolean)
          .join(" "),
      },
      resolved.location,
    ),
    detail: {
      title,
      held_date: heldDate,
      prefecture: resolved.prefecture,
      municipality: resolved.municipality,
      venue,
      channel: readValue(row, "チャンネル名"),
      performing_groups: values.performingGroups,
      preservation_groups: values.preservationGroups,
      folk_art_names: values.artNames,
      program_names: values.programNames,
      video_ids: values.videoIds,
      source_urls: values.sourceUrls,
      source_workbook: sourceWorkbook,
      source_fields: row,
      supplemental_sources: [],
    },
  };
}

function buildCalendarRecord(row, locationIndex) {
  const recordId = String(row.record_id);
  const title = String(row["名称"] ?? "名称未確認");
  const placeText = String(row["場所・日時など（原文）"] ?? "");
  const resolved = resolveTextLocation(locationIndex, null, null, placeText);
  const detailId = `events/calendar_${recordId}`;
  const heldDate = excelDateToIso(row["開始日"]);
  const sourceUrls = uniqueValues([
    ...splitUrls(row["関連URL"]),
    ...splitUrls(row["元ページURL"]),
  ]);

  return {
    record: makeRecord(
      {
        entity_id: `calendar_${recordId}`,
        detail_id: detailId,
        mode: "events",
        record_type: "calendar_event",
        evidence_layer: "research",
        title,
        prefecture: resolved.prefecture,
        municipality: resolved.municipality,
        category: "calendar_event",
        verification_status: String(row["情報状態"] ?? "research"),
        held_date: heldDate,
        video_count: 0,
        search_text: [title, placeText].join(" "),
      },
      resolved.location,
    ),
    detail: {
      title,
      held_date: heldDate,
      end_date: excelDateToIso(row["終了日"]),
      original_date: row["月日（原文）"],
      prefecture: resolved.prefecture,
      municipality: resolved.municipality,
      venue: placeText,
      note: row["情報状態"],
      date_interpretation: row["日付解釈"],
      source_urls: sourceUrls,
      source_workbook: sourcePaths.calendar,
      source_fields: row,
    },
  };
}

function fieldworkCategory(row) {
  if (row["イベント名"]) return "fieldwork_plan";
  const text = `${row["備考"] ?? ""} ${row["住所"] ?? ""}`;
  if (/聞き取り|インタビュー|面談/.test(text)) return "fieldwork_interview";
  return "fieldwork_information";
}

function buildFieldworkRecord(row, locationIndex) {
  const category = fieldworkCategory(row);
  const address = String(row["住所"] ?? "");
  const note = String(row["備考"] ?? "");
  const title = String(
    row["イベント名"] ||
      note.split(/\r?\n/).find(Boolean) ||
      address ||
      `出張計画 ${row["整理番号"]}`,
  );
  const resolved = resolveTextLocation(locationIndex, null, null, address);
  const entityId = hashId(
    "fieldwork",
    `${row["整理番号"]}|${row["日付"]}|${title}`,
  );
  const detailId = `events/${entityId}`;

  return {
    record: makeRecord(
      {
        entity_id: entityId,
        detail_id: detailId,
        mode: "events",
        record_type: category,
        evidence_layer: "planned",
        title,
        prefecture: resolved.prefecture,
        municipality: resolved.municipality,
        category,
        verification_status: "planned",
        held_date: String(row["日付"] ?? ""),
        video_count: 0,
        search_text: [title, address, note].join(" "),
      },
      resolved.location,
    ),
    detail: {
      title,
      held_date: String(row["日付"] ?? ""),
      start_time: row["開始時刻"],
      prefecture: resolved.prefecture,
      municipality: resolved.municipality,
      venue: address,
      note: row["備考"],
      cost: row["経費"],
      source_workbook: sourcePaths.fieldwork,
      source_fields: row,
    },
  };
}

function buildEvents(
  videoRows,
  eventStructuredRows,
  eventRows,
  tohokuStructuredRows,
  tohokuEventRows,
  calendarRows,
  fieldworkRows,
  locationIndex,
) {
  const records = [];
  const details = new Map();
  const supplements = videoSupplementIndex(
    eventStructuredRows,
    tohokuStructuredRows,
  );
  const primaryVideoIds = new Set(
    videoRows.map((row) => String(row.video_id)).filter(Boolean),
  );
  const videoLocations = new Map();

  const eventIdentityToDetail = new Map();
  for (const row of eventRows) {
    const built = buildEventGroupRecord(
      row,
      locationIndex,
      sourcePaths.events,
      "event_group",
    );
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
    eventIdentityToDetail.set(eventIdentity(row), built.record.detail_id);
  }

  let addedTohokuEvents = 0;
  let mergedTohokuEvents = 0;
  for (const row of tohokuEventRows) {
    const existingDetailId = eventIdentityToDetail.get(eventIdentity(row));
    if (existingDetailId) {
      const detail = details.get(existingDetailId);
      const values = eventGroupValues(row);
      detail.video_ids = uniqueValues([...detail.video_ids, ...values.videoIds]);
      detail.source_urls = uniqueValues([
        ...detail.source_urls,
        ...values.sourceUrls,
      ]);
      detail.supplemental_sources.push({
        source_workbook: sourcePaths.tohoku,
        fields: row,
      });
      mergedTohokuEvents += 1;
      continue;
    }
    const built = buildEventGroupRecord(
      row,
      locationIndex,
      sourcePaths.tohoku,
      "tohoku_event_group",
    );
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
    eventIdentityToDetail.set(eventIdentity(row), built.record.detail_id);
    addedTohokuEvents += 1;
  }

  for (const row of calendarRows) {
    const built = buildCalendarRecord(row, locationIndex);
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
  }

  for (const row of fieldworkRows) {
    const built = buildFieldworkRecord(row, locationIndex);
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
  }

  for (const row of videoRows) {
    const videoId = String(row.video_id);
    const built = buildVideoRecord(
      row,
      supplements.get(videoId) ?? [],
      locationIndex,
      sourcePaths.videos,
    );
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
    videoLocations.set(videoId, {
      coordinates: built.record.coordinates,
      precision: built.record.location_precision,
      prefecture: built.record.prefecture,
      municipality: built.record.municipality,
    });
  }

  let supplementalVideoCount = 0;
  for (const [videoId, sourceRows] of supplements) {
    if (primaryVideoIds.has(videoId)) continue;
    const sourceRow = sourceRows[0];
    const built = buildVideoRecord(
      sourceRow.fields,
      sourceRows.slice(1),
      locationIndex,
      sourceRow.source_workbook,
    );
    records.push(built.record);
    details.set(built.record.detail_id, built.detail);
    videoLocations.set(videoId, {
      coordinates: built.record.coordinates,
      precision: built.record.location_precision,
      prefecture: built.record.prefecture,
      municipality: built.record.municipality,
    });
    supplementalVideoCount += 1;
  }

  return {
    records,
    details,
    videoLocations,
    stats: {
      primaryVideoCount: videoRows.length,
      supplementalVideoCount,
      eventGroupCount: eventRows.length + addedTohokuEvents,
      mergedTohokuEvents,
      calendarCount: calendarRows.length,
      fieldworkCount: fieldworkRows.length,
      eventStructuredMatched: eventStructuredRows.filter((row) =>
        primaryVideoIds.has(String(row.video_id)),
      ).length,
      tohokuStructuredMatched: tohokuStructuredRows.filter((row) =>
        primaryVideoIds.has(String(row.video_id)),
      ).length,
    },
  };
}

function directoryLocation(row, channelByName, videoLocations) {
  const exactChannel = channelByName.get(String(row["団体名"]));
  if (exactChannel?.location) return exactChannel;

  const sourceLocations = splitValues(row["代表video_id"])
    .map((videoId) => videoLocations.get(videoId))
    .filter((item) => Array.isArray(item?.coordinates));
  if (sourceLocations.length === 0) {
    return { location: null, prefecture: null, municipality: null };
  }

  const prefectureValues = uniqueValues(
    sourceLocations.map((item) => item.prefecture),
  );
  const municipalityValues = uniqueValues(
    sourceLocations.map((item) => item.municipality),
  );
  return {
    location: {
      coordinates: averageCoordinates(
        sourceLocations.map((item) => item.coordinates),
      ),
      precision:
        sourceLocations.length === 1
          ? "source_video_location"
          : "source_video_locations_centroid",
    },
    prefecture:
      prefectureValues.length === 1 ? prefectureValues[0] : null,
    municipality:
      municipalityValues.length === 1 ? municipalityValues[0] : null,
  };
}

function buildOrganizations(
  channelRows,
  directoryRows,
  videoLocations,
  locationIndex,
) {
  const records = [];
  const details = new Map();
  const channelByName = new Map();

  for (const row of channelRows) {
    const prefecture = findPrefecture(row["都道府県"]);
    const location = locationIndex.resolve(prefecture, null);
    const title = String(row["チャンネル名"] ?? "名称未確認");
    const entityId = `channel_${row.channel_id}`;
    const detailId = `organizations/${entityId}`;
    const record = makeRecord(
      {
        entity_id: entityId,
        detail_id: detailId,
        mode: "organizations",
        record_type: "channel",
        evidence_layer: "research",
        title,
        prefecture,
        municipality: null,
        category: "channel",
        verification_status:
          row["要確認"] === "確認不要" ? "reviewed" : "needs_review",
        confidence: String(row["関連確信度"] ?? "unknown"),
        public_video_count: Number(row["公開動画数"] ?? 0),
        search_text: [
          title,
          row["運営主体"],
          row["地方"],
          row["検出芸能語"],
        ]
          .filter(Boolean)
          .join(" "),
      },
      location,
    );
    records.push(record);
    details.set(detailId, {
      title,
      organization_type: row["運営主体"],
      prefecture,
      region: row["地方"],
      channel_url: row["チャンネルURL"],
      location_evidence_type: row["所在地根拠種別"],
      location_confidence: row["所在地確度"],
      relevance_confidence: row["関連確信度"],
      detected_art_terms: splitValues(row["検出芸能語"]),
      dedicated_channel: row["専用チャンネル"],
      source_urls: splitUrls(row["代表根拠URL"]),
      source_workbook: sourcePaths.videos,
      source_fields: row,
    });
    channelByName.set(title, {
      location,
      prefecture,
      municipality: null,
    });
  }

  for (const row of directoryRows) {
    const title = String(row["団体名"] ?? "名称未確認");
    const resolved = directoryLocation(row, channelByName, videoLocations);
    const entityId = `directory_${row["団体ID"]}`;
    const detailId = `organizations/${entityId}`;
    const sourceUrls = uniqueValues([
      ...splitUrls(row["根拠URL"]),
      ...splitUrls(row["Webサイト・紹介ページ"]),
      ...splitUrls(row["YouTubeチャンネル"]),
      ...splitUrls(row.Instagram),
      ...splitUrls(row.X),
      ...splitUrls(row.Facebook),
    ]);
    const record = makeRecord(
      {
        entity_id: entityId,
        detail_id: detailId,
        mode: "organizations",
        record_type: "organization_directory",
        evidence_layer: "research",
        title,
        prefecture: resolved.prefecture,
        municipality: resolved.municipality,
        category: "organization_directory",
        verification_status:
          row["要確認"] === "確認不要" ? "reviewed" : "needs_review",
        confidence: String(row["確信度"] ?? "unknown"),
        public_video_count: Number(row["動画数"] ?? 0),
        search_text: [
          title,
          row["別名"],
          row["団体種別"],
          row["登場チャンネル"],
        ]
          .filter(Boolean)
          .join(" "),
      },
      resolved.location,
    );
    records.push(record);
    details.set(detailId, {
      title,
      aliases: splitValues(row["別名"]),
      organization_type: row["団体種別"],
      appearance_type: row["登場区分"],
      prefecture: resolved.prefecture,
      municipality: resolved.municipality,
      channel_url: row["YouTubeチャンネル"],
      web_url: row["Webサイト・紹介ページ"],
      instagram: row.Instagram,
      x: row.X,
      facebook: row.Facebook,
      relevance_confidence: row["確信度"],
      representative_video_ids: splitValues(row["代表video_id"]),
      source_urls: sourceUrls,
      source_workbook: sourcePaths.events,
      source_fields: row,
    });
  }

  return { records, details };
}

async function extractExcelSources() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "fparts-map-data-"));
  try {
    const extracted = {};
    for (const sourceKey of Object.keys(sourcePaths)) {
      const outputPath = path.join(temporaryRoot, `${sourceKey}.json`);
      execFileSync(process.execPath, [extractorPath, sourceKey, outputPath], {
        cwd: projectRoot,
        stdio: "inherit",
      });
      extracted[sourceKey] = JSON.parse(await readFile(outputPath, "utf8"));
    }
    return extracted;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function writeJson(relativePath, value, pretty = false) {
  const outputPath = path.join(datasetRoot, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(value, null, pretty ? 2 : 0)}\n`,
    "utf8",
  );
}

async function writeShardedDetails(mode, details) {
  const shards = new Map();
  for (const [detailId, detail] of details) {
    const shard = detailShard(detailId);
    if (!shards.has(shard)) shards.set(shard, {});
    shards.get(shard)[detailId] = detail;
  }
  await Promise.all(
    [...shards].map(([shard, values]) =>
      writeJson(`details/${mode}/${shard}.json`, values),
    ),
  );
  return shards.size;
}

function buildModeManifest(mode, label, description, dataset, breakdown) {
  const featureCount = dataset.records.filter((record) =>
    Array.isArray(record.coordinates),
  ).length;
  return {
    label,
    description,
    record_count: dataset.records.length,
    feature_count: featureCount,
    unmapped_count: dataset.records.length - featureCount,
    breakdown,
    records: `${mode}.records.json`,
    geojson: `${mode}.geojson`,
    details: `details/${mode}/{shard}.json`,
  };
}

const [rawRecords, arts, designations, excelSources] = await Promise.all([
  readFile(
    path.join(
      projectRoot,
      "data",
      "raw",
      "nabunken_heritage_map",
      "2026-07-29",
      "intangible_cultural_properties.jsonl",
    ),
    "utf8",
  ).then(parseJsonl),
  readFile(
    path.join(projectRoot, "data", "cultural_properties", "performing_arts.jsonl"),
    "utf8",
  ).then(parseJsonl),
  readFile(
    path.join(
      projectRoot,
      "data",
      "cultural_properties",
      "heritage_designations.jsonl",
    ),
    "utf8",
  ).then(parseJsonl),
  extractExcelSources(),
]);

const videoRows = rowsToObjects(excelSources.videos.videos);
const channelRows = rowsToObjects(excelSources.videos.channels);
const eventStructuredRows = rowsToObjects(
  excelSources.events.structuredVideos,
);
const eventRows = rowsToObjects(excelSources.events.events);
const directoryRows = rowsToObjects(excelSources.events.directory);
const tohokuStructuredRows = rowsToObjects(
  excelSources.tohoku.structuredVideos,
);
const tohokuEventRows = rowsToObjects(excelSources.tohoku.events);
const calendarRows = rowsToObjects(excelSources.calendar.events);
const fieldworkRows = rowsToObjects(excelSources.fieldwork.rows);

const locationIndex = buildLocationIndex(rawRecords);
const artsDataset = buildArts(rawRecords, arts, designations);
const eventDataset = buildEvents(
  videoRows,
  eventStructuredRows,
  eventRows,
  tohokuStructuredRows,
  tohokuEventRows,
  calendarRows,
  fieldworkRows,
  locationIndex,
);
const organizationDataset = buildOrganizations(
  channelRows,
  directoryRows,
  eventDataset.videoLocations,
  locationIndex,
);

const modes = {
  arts: buildModeManifest(
    "arts",
    "芸能・文化財",
    "全芸能実体を収録し、取得元の座標を確認できたものだけを地図表示。",
    artsDataset,
    [
      { label: "芸能実体", count: arts.length },
      { label: "指定等の記録", count: designations.length },
    ],
  ),
  events: buildModeManifest(
    "events",
    "公演・映像",
    "動画、構造化イベント、2000〜2026年の芸能暦、出張計画を全件検索可能。",
    eventDataset,
    [
      {
        label: "動画",
        count:
          eventDataset.stats.primaryVideoCount +
          eventDataset.stats.supplementalVideoCount,
      },
      {
        label: "構造化イベント",
        count: eventDataset.stats.eventGroupCount,
      },
      { label: "芸能暦", count: eventDataset.stats.calendarCount },
      { label: "出張計画", count: eventDataset.stats.fieldworkCount },
    ],
  ),
  organizations: buildModeManifest(
    "organizations",
    "保存会・団体",
    "YouTubeチャンネルと団体Web・SNS調査の全レコードを検索可能。",
    organizationDataset,
    [
      { label: "YouTubeチャンネル", count: channelRows.length },
      { label: "団体Web・SNS", count: directoryRows.length },
    ],
  ),
};

const manifest = {
  schema_version: "2.0",
  dataset_version: datasetVersion,
  generated_at: "2026-07-30",
  title: "郷土芸能・民俗芸能・伝統芸能 地図プロトタイプ",
  coordinate_policy:
    "出典座標、市区町村代表点、都道府県代表点、根拠動画地点の順で使用。位置を確定できないレコードも一覧・検索・詳細には収録する。",
  deduplication_policy:
    "最新版Excelを正本とし、同一video_idの構造化情報は1動画へ統合。旧版・作業コピーは重複加算せず、置換関係をデータ源一覧に明記する。",
  modes,
  sources: [
    {
      name: "文化財カタログ",
      path: "data/cultural_properties/*.jsonl",
      status: "included",
      detail: `${arts.length.toLocaleString("ja-JP")}芸能 / ${designations.length.toLocaleString("ja-JP")}指定等`,
    },
    {
      name: "YouTubeチャンネル・動画全国調査",
      path: sourcePaths.videos,
      status: "included",
      detail: `${videoRows.length.toLocaleString("ja-JP")}動画 / ${channelRows.length.toLocaleString("ja-JP")}チャンネル`,
    },
    {
      name: "動画イベント・団体Web/SNS",
      path: sourcePaths.events,
      status: "included",
      detail: `${eventStructuredRows.length.toLocaleString("ja-JP")}動画構造化行（${eventDataset.stats.eventStructuredMatched.toLocaleString("ja-JP")}件を動画ID統合） / ${eventRows.length.toLocaleString("ja-JP")}イベント / ${directoryRows.length.toLocaleString("ja-JP")}団体`,
    },
    {
      name: "東北文化研究センター動画調査",
      path: sourcePaths.tohoku,
      status: "included",
      detail: `${tohokuStructuredRows.length.toLocaleString("ja-JP")}動画構造化行（${eventDataset.stats.tohokuStructuredMatched.toLocaleString("ja-JP")}件を既存動画へ統合 / ${eventDataset.stats.supplementalVideoCount.toLocaleString("ja-JP")}件を追加） / ${tohokuEventRows.length.toLocaleString("ja-JP")}イベント行`,
    },
    {
      name: "みちのく芸能ごよみ",
      path: sourcePaths.calendar,
      status: "included",
      detail: `${calendarRows.length.toLocaleString("ja-JP")}件（2000〜2026年）`,
    },
    {
      name: "出張計画",
      path: sourcePaths.fieldwork,
      status: "included",
      detail: `${fieldworkRows.length.toLocaleString("ja-JP")}件（公演・情報収集・聞き取りを含む）`,
    },
    ...supersededSources.map((source) => ({
      name: "旧版・作業コピー",
      path: source.path,
      status: "superseded_duplicate",
      detail: `重複加算せず ${source.replaced_by} に統合`,
    })),
  ],
  integration: {
    event_structured_rows: eventStructuredRows.length,
    event_structured_matched_to_primary_video:
      eventDataset.stats.eventStructuredMatched,
    tohoku_structured_rows: tohokuStructuredRows.length,
    tohoku_structured_matched_to_primary_video:
      eventDataset.stats.tohokuStructuredMatched,
    supplemental_unique_videos: eventDataset.stats.supplementalVideoCount,
    tohoku_events_merged: eventDataset.stats.mergedTohokuEvents,
  },
};

await Promise.all([
  writeJson("manifest.json", manifest, true),
  writeJson("arts.records.json", artsDataset.records),
  writeJson("events.records.json", eventDataset.records),
  writeJson("organizations.records.json", organizationDataset.records),
  writeJson("arts.geojson", featureCollection(artsDataset.records)),
  writeJson("events.geojson", featureCollection(eventDataset.records)),
  writeJson(
    "organizations.geojson",
    featureCollection(organizationDataset.records),
  ),
  writeShardedDetails("arts", artsDataset.details),
  writeShardedDetails("events", eventDataset.details),
  writeShardedDetails("organizations", organizationDataset.details),
]);

await writeFile(
  path.join(projectRoot, "prototype-map", "public", "datasets", "current.json"),
  `${JSON.stringify(
    {
      dataset_version: datasetVersion,
      manifest: `${datasetVersion}/manifest.json`,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

process.stdout.write(
  `${JSON.stringify(
    {
      datasetVersion,
      modes,
      integration: manifest.integration,
    },
    null,
    2,
  )}\n`,
);
