import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const sourceSpecs = {
  videos: {
    path: "outputs/019fac96-97d3-77a1-85fe-e3e3115bb409/youtube_folk_performing_arts_channels_2026-07-29_expanded.xlsx",
    ranges: [
      { key: "channels", sheet: "チャンネル一覧", range: "A1:T1118" },
      { key: "videos", sheet: "動画カタログ", range: "A1:T49340" },
    ],
  },
  events: {
    path: "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/three_channels_youtube_event_catalog_2026-07-29_expanded_update_duration_shorts.xlsx",
    ranges: [
      {
        key: "structuredVideos",
        sheet: "動画イベント値",
        range: "A1:AP41635",
      },
      { key: "events", sheet: "イベント一覧", range: "A1:R891" },
      { key: "directory", sheet: "団体Web・SNS", range: "A1:R2080" },
    ],
  },
  tohoku: {
    path: "outputs/019fac2a-519f-7d00-bbd1-4f8829e0039b/tohokubuneiken_folk_arts_catalog_2026-07-29.xlsx",
    ranges: [
      {
        key: "structuredVideos",
        sheet: "動画イベント値",
        range: "A1:U9394",
      },
      { key: "events", sheet: "イベント一覧", range: "A1:P31" },
    ],
  },
  calendar: {
    path: "outputs/019fac8b-45c8-7c21-aca3-2d8a1fcc816e/iwagei_michinoku_geino_calendar_2000-2026_2026-07-29.xlsx",
    ranges: [
      { key: "events", sheet: "イベント", range: "A1:P17281" },
    ],
  },
};

const sourceKey = process.argv[2];
const outputPath = process.argv[3];
const spec = sourceSpecs[sourceKey];

if (!spec || !outputPath) {
  throw new Error(
    "Usage: node extract_map_excel_source.mjs <source-key> <output.json>",
  );
}

const workbook = await SpreadsheetFile.importXlsx(
  await FileBlob.load(path.join(projectRoot, spec.path)),
);
const extracted = Object.fromEntries(
  spec.ranges.map(({ key, sheet, range }) => [
    key,
    workbook.worksheets.getItem(sheet).getRange(range).values,
  ]),
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, JSON.stringify(extracted), "utf8");
