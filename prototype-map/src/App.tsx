import { useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "./components/MapCanvas";
import {
  StaticDatasetProvider,
  type DatasetManifest,
  type FeatureDetail,
  type MapMode,
  type MapRecord,
  type PointFeature,
  type PointFeatureCollection,
} from "./data";

const emptyCollection: PointFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const modeOrder: MapMode[] = ["arts", "events", "organizations"];
const initialVisibleCount = 100;

const prefectureOrder = [
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
] as const;

const prefectureRank = new Map<string, number>(
  prefectureOrder.map((prefecture, index) => [prefecture, index]),
);

const modeShortLabels: Record<MapMode, string> = {
  arts: "芸能・文化財",
  events: "公演・映像",
  organizations: "保存会・団体",
};

const precisionLabels: Record<string, string> = {
  source_point: "出典地点",
  source_points_centroid: "複数出典地点の中心",
  municipality_centroid: "市区町村代表点",
  prefecture_centroid: "都道府県代表点",
  source_video_location: "根拠動画の地点",
  source_video_locations_centroid: "複数根拠動画地点の中心",
  conceptual: "シリーズ概念（地図点なし）",
  unmapped: "位置未確定",
};

const evidenceLabels: Record<string, string> = {
  official: "公的資料",
  research: "調査データ",
  planned: "調査計画",
};

const categoryLabels: Record<string, string> = {
  not_stated: "公式下位分類の記載なし",
  kagura: "神楽",
  dengaku: "田楽",
  furyu: "風流",
  narrative_blessing: "語り物・祝福芸",
  ennen_okonai: "延年・おこない",
  imported_stage: "渡来芸・舞台芸",
  other: "その他",
  performing_art: "芸能・文化財",
  video: "動画",
  event_series: "イベントシリーズ",
  video_event: "構造化イベント",
  channel: "YouTubeチャンネル",
  organization_directory: "団体Web・SNS",
};

function formatNumber(value: number) {
  return value.toLocaleString("ja-JP");
}

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "未収録";
  if (Array.isArray(value)) return value.map(textValue).join("、") || "未収録";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getLocationLabel(record: MapRecord) {
  if (record.location_precision === "conceptual") {
    return (
      [record.prefecture, record.municipality].filter(Boolean).join(" ") ||
      "複数開催地"
    );
  }
  return (
    [record.prefecture, record.municipality].filter(Boolean).join(" ") ||
    "位置未確定"
  );
}

function toPointFeature(record: MapRecord): PointFeature | null {
  if (!record.coordinates) return null;
  const { coordinates, search_text: _searchText, ...properties } = record;
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates },
    properties,
  };
}

function SourceFieldRows({ fields }: { fields: Record<string, unknown> }) {
  const entries = Object.entries(fields).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );
  return (
    <dl className="source-field-grid">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{textValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function SourceDataSection({ detail }: { detail: FeatureDetail | null }) {
  const sourceFields = isObject(detail?.source_fields)
    ? detail.source_fields
    : null;
  const supplementalSources = Array.isArray(detail?.supplemental_sources)
    ? detail.supplemental_sources.filter(isObject)
    : [];

  if (!sourceFields && supplementalSources.length === 0) return null;

  return (
    <details className="source-data-section">
      <summary>元データの全項目を表示</summary>
      {sourceFields && <SourceFieldRows fields={sourceFields} />}
      {supplementalSources.map((source, index) => (
        <section className="supplemental-source" key={index}>
          <h4>{textValue(source.source_workbook)}</h4>
          {isObject(source.fields) && <SourceFieldRows fields={source.fields} />}
        </section>
      ))}
    </details>
  );
}

interface DetailPanelProps {
  manifest: DatasetManifest;
  record: MapRecord | null;
  detail: FeatureDetail | null;
  loading: boolean;
  onClose: () => void;
  onSelectRecord: (entityId: string) => void;
}

function DetailPanel({
  manifest,
  record,
  detail,
  loading,
  onClose,
  onSelectRecord,
}: DetailPanelProps) {
  if (!record) {
    return (
      <aside className="detail-panel">
        <div className="detail-kicker">DATASET</div>
        <h2>初期収録データ</h2>
        <p className="detail-lead">
          地図上の地点だけでなく、位置未確定のレコードも左の一覧から選択できる。
        </p>
        <dl className="dataset-overview">
          {modeOrder.map((mode) => {
            const item = manifest.modes[mode];
            return (
              <div key={mode}>
                <dt>{item.label}</dt>
                <dd>
                  全 {formatNumber(item.record_count)}件
                  <span>
                    {" "}
                    / 地図 {formatNumber(item.feature_count)}件 / 位置未確定{" "}
                    {formatNumber(item.unmapped_count)}件
                    {item.conceptual_count > 0
                      ? ` / 概念 ${formatNumber(item.conceptual_count)}件`
                      : ""}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="panel-rule" />
        <h3>データ源</h3>
        <div className="source-list">
          {manifest.sources.map((source) => (
            <article
              className={
                source.status === "superseded_duplicate" ? "superseded" : ""
              }
              key={source.path}
            >
              <strong>{source.name}</strong>
              <span>{source.detail}</span>
              <code>{source.path}</code>
            </article>
          ))}
        </div>
        <p className="coordinate-note">{manifest.coordinate_policy}</p>
        <p className="coordinate-note">{manifest.deduplication_policy}</p>
      </aside>
    );
  }

  const mode = record.mode;
  const sourceUrls = Array.isArray(detail?.source_urls)
    ? detail.source_urls.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const designations = Array.isArray(detail?.designations)
    ? (detail.designations as Array<Record<string, unknown>>)
    : [];
  const linkEntries = [
    ["動画", detail?.video_url],
    ["チャンネル", detail?.channel_url],
    ["Webサイト", detail?.web_url],
    ["Instagram", detail?.instagram],
    ["X", detail?.x],
    ["Facebook", detail?.facebook],
  ].filter((entry): entry is [string, string] => typeof entry[1] === "string");
  const parentSeriesId =
    typeof detail?.parent_series_id === "string"
      ? detail.parent_series_id
      : null;
  const seriesChildren = Array.isArray(detail?.children)
    ? detail.children.filter(isObject)
    : [];

  return (
    <aside className="detail-panel">
      <button className="detail-close" onClick={onClose} type="button">
        閉じる
      </button>
      <div className="detail-kicker">{modeShortLabels[mode]}</div>
      <h2>{record.title}</h2>
      <div className="detail-badges">
        <span>{categoryLabels[record.record_type] ?? record.record_type}</span>
        <span>{evidenceLabels[record.evidence_layer]}</span>
        <span>
          {precisionLabels[record.location_precision] ??
            record.location_precision}
        </span>
      </div>
      {loading ? (
        <p className="detail-lead">詳細を読み込み中...</p>
      ) : (
        <>
          <dl className="detail-fields">
            <div>
              <dt>所在地</dt>
              <dd>{getLocationLabel(record)}</dd>
            </div>
            {mode === "arts" && (
              <>
                <div>
                  <dt>概要</dt>
                  <dd>{textValue(detail?.summary)}</dd>
                </div>
                <div>
                  <dt>運用分類</dt>
                  <dd>{textValue(detail?.archive_genre_ids)}</dd>
                </div>
              </>
            )}
            {mode === "events" && (
              <>
                {record.record_type === "event_series" ? (
                  <>
                    <div>
                      <dt>収録開催回数</dt>
                      <dd>{textValue(detail?.occurrence_count)}</dd>
                    </div>
                    <div>
                      <dt>収録年</dt>
                      <dd>{textValue(detail?.occurrence_years)}</dd>
                    </div>
                    <div>
                      <dt>収録回次</dt>
                      <dd>{textValue(detail?.edition_numbers)}</dd>
                    </div>
                    <div>
                      <dt>未収録の中間回次</dt>
                      <dd>{textValue(detail?.missing_edition_numbers)}</dd>
                    </div>
                    <div>
                      <dt>同定根拠</dt>
                      <dd>{textValue(detail?.identification_evidence)}</dd>
                    </div>
                    <div>
                      <dt>関係の注記</dt>
                      <dd>{textValue(detail?.note)}</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>開催・公開日</dt>
                      <dd>{textValue(detail?.held_date)}</dd>
                    </div>
                    <div>
                      <dt>会場・場所</dt>
                      <dd>{textValue(detail?.venue)}</dd>
                    </div>
                    <div>
                      <dt>芸能名</dt>
                      <dd>{textValue(detail?.folk_art_names)}</dd>
                    </div>
                    <div>
                      <dt>出演団体</dt>
                      <dd>{textValue(detail?.performing_groups)}</dd>
                    </div>
                    <div>
                      <dt>備考</dt>
                      <dd>{textValue(detail?.note)}</dd>
                    </div>
                    {record.record_type === "video_event" &&
                      parentSeriesId && (
                        <>
                          <div>
                            <dt>親イベントシリーズ</dt>
                            <dd>{textValue(detail?.series_title)}</dd>
                          </div>
                          <div>
                            <dt>シリーズ内の回次・年</dt>
                            <dd>
                              {detail?.series_edition_number
                                ? `第${textValue(
                                    detail.series_edition_number,
                                  )}回`
                                : textValue(detail?.series_year)}
                            </dd>
                          </div>
                        </>
                      )}
                  </>
                )}
              </>
            )}
            {mode === "organizations" && (
              <>
                <div>
                  <dt>主体種別</dt>
                  <dd>{textValue(detail?.organization_type)}</dd>
                </div>
                <div>
                  <dt>関連確信度</dt>
                  <dd>{textValue(detail?.relevance_confidence)}</dd>
                </div>
                <div>
                  <dt>検出芸能語</dt>
                  <dd>{textValue(detail?.detected_art_terms)}</dd>
                </div>
              </>
            )}
          </dl>

          {parentSeriesId && (
            <section className="detail-section series-links">
              <h3>イベントシリーズ</h3>
              <button
                onClick={() => onSelectRecord(parentSeriesId)}
                type="button"
              >
                親シリーズ「{textValue(detail?.series_title)}」を開く
              </button>
            </section>
          )}

          {seriesChildren.length > 0 && (
            <section className="detail-section series-links">
              <h3>収録されている開催回</h3>
              {seriesChildren.map((child) => {
                const entityId =
                  typeof child.entity_id === "string"
                    ? child.entity_id
                    : "";
                return (
                  <button
                    disabled={!entityId}
                    key={entityId || textValue(child.title)}
                    onClick={() => onSelectRecord(entityId)}
                    type="button"
                  >
                    <strong>{textValue(child.title)}</strong>
                    <span>
                      {textValue(child.held_date)}
                      {child.edition_number
                        ? ` / 第${textValue(child.edition_number)}回`
                        : ""}
                    </span>
                  </button>
                );
              })}
            </section>
          )}

          {designations.length > 0 && (
            <section className="detail-section">
              <h3>指定等の記録</h3>
              {designations.slice(0, 6).map((designation, index) => (
                <article className="designation-card" key={index}>
                  <strong>{textValue(designation.type)}</strong>
                  <span>
                    {textValue(designation.authority)} /{" "}
                    {textValue(designation.date)}
                  </span>
                  {typeof designation.source_url === "string" && (
                    <a
                      href={designation.source_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      出典を開く
                    </a>
                  )}
                </article>
              ))}
            </section>
          )}

          {(sourceUrls.length > 0 || linkEntries.length > 0) && (
            <section className="detail-section">
              <h3>参照先</h3>
              <div className="link-list">
                {linkEntries.map(([label, url]) => (
                  <a
                    href={url}
                    key={`${label}:${url}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {label}
                  </a>
                ))}
                {sourceUrls.slice(0, 8).map((url, index) => (
                  <a
                    href={url}
                    key={`${index}:${url}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    出典 {index + 1}
                  </a>
                ))}
              </div>
            </section>
          )}

          <SourceDataSection detail={detail} />
        </>
      )}
    </aside>
  );
}

export default function App() {
  const provider = useMemo(() => new StaticDatasetProvider(), []);
  const [manifest, setManifest] = useState<DatasetManifest | null>(null);
  const [mode, setMode] = useState<MapMode>("arts");
  const [records, setRecords] = useState<MapRecord[]>([]);
  const [query, setQuery] = useState("");
  const [prefecture, setPrefecture] = useState("all");
  const [precision, setPrecision] = useState("all");
  const [evidence, setEvidence] = useState("all");
  const [recordType, setRecordType] = useState("all");
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [selectedRecord, setSelectedRecord] = useState<MapRecord | null>(null);
  const [detail, setDetail] = useState<FeatureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequestId = useRef(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    provider
      .loadManifest()
      .then(setManifest)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : String(caught)),
      );
  }, [provider]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRecords([]);
    detailRequestId.current += 1;
    setDetailLoading(false);
    setQuery("");
    setPrefecture("all");
    setPrecision("all");
    setEvidence("all");
    setRecordType("all");
    setVisibleCount(initialVisibleCount);
    setSelectedRecord(null);
    setDetail(null);
    provider
      .loadRecords(mode)
      .then((items) => {
        if (!cancelled) setRecords(items);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, provider]);

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [query, prefecture, precision, evidence, recordType]);

  const prefectures = useMemo(
    () =>
      [...new Set(records.map((item) => item.prefecture))]
        .filter((item): item is string => Boolean(item))
        .sort(
          (a, b) =>
            (prefectureRank.get(a) ?? Number.MAX_SAFE_INTEGER) -
              (prefectureRank.get(b) ?? Number.MAX_SAFE_INTEGER) ||
            a.localeCompare(b, "ja"),
        ),
    [records],
  );

  const precisions = useMemo(
    () => [...new Set(records.map((item) => item.location_precision))],
    [records],
  );

  const recordTypes = useMemo(
    () => [...new Set(records.map((item) => item.record_type))],
    [records],
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ja");
    return records.filter((item) => {
      const haystack = [
        item.title,
        item.prefecture,
        item.municipality,
        item.category,
        item.search_text,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("ja");
      return (
        (!normalizedQuery || haystack.includes(normalizedQuery)) &&
        (prefecture === "all" || item.prefecture === prefecture) &&
        (precision === "all" || item.location_precision === precision) &&
        (evidence === "all" || item.evidence_layer === evidence) &&
        (recordType === "all" || item.record_type === recordType)
      );
    });
  }, [evidence, precision, prefecture, query, recordType, records]);

  const filteredCollection = useMemo<PointFeatureCollection>(() => {
    const features = filtered
      .map(toPointFeature)
      .filter((item): item is PointFeature => item !== null);
    return { type: "FeatureCollection", features };
  }, [filtered]);

  const selectedFeature = useMemo(
    () => (selectedRecord ? toPointFeature(selectedRecord) : null),
    [selectedRecord],
  );

  async function selectRecord(entityId: string) {
    // A late response must not replace a newer selection or reopen closed details.
    const requestId = ++detailRequestId.current;
    const record =
      records.find((item) => item.entity_id === entityId) ?? null;
    setSelectedRecord(record);
    setDetail(null);
    if (!record) return;

    setDetailLoading(true);
    try {
      const loaded = await provider.loadDetail(
        mode,
        record.detail_id,
        record.detail_shard,
      );
      if (requestId === detailRequestId.current) setDetail(loaded);
    } catch (caught) {
      if (requestId === detailRequestId.current) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    } finally {
      if (requestId === detailRequestId.current) setDetailLoading(false);
    }
  }

  if (error) {
    return (
      <main className="fatal-state">
        <h1>データを読み込めなかった</h1>
        <p>{error}</p>
        <p>開発サーバー経由で表示しているか確認してください。</p>
      </main>
    );
  }

  if (!manifest) {
    return <main className="loading-state">データセットを読み込み中...</main>;
  }

  const modeManifest = manifest.modes[mode];
  const visibleRecords = filtered.slice(0, visibleCount);

  return (
    <main className="app-shell">
      <aside className="control-panel">
        <header className="brand">
          <div className="brand-mark">GEINO ARCHIVE</div>
          <h1>芸能アーカイブマップ</h1>
          <p>郷土芸能・民俗芸能・伝統芸能を、根拠と位置精度付きで見る。</p>
        </header>

        <nav className="mode-tabs" aria-label="地図モード">
          {modeOrder.map((item) => (
            <button
              className={mode === item ? "active" : ""}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {modeShortLabels[item]}
              <span>{formatNumber(manifest.modes[item].record_count)}</span>
            </button>
          ))}
        </nav>

        <section className="collection-card">
          <div>
            <span>全収録</span>
            <strong>{formatNumber(modeManifest.record_count)}</strong>
            <small>件</small>
          </div>
          <p>{modeManifest.description}</p>
          <dl>
            <div>
              <dt>地図表示</dt>
              <dd>{formatNumber(modeManifest.feature_count)}件</dd>
            </div>
            <div>
              <dt>位置未確定</dt>
              <dd>{formatNumber(modeManifest.unmapped_count)}件</dd>
            </div>
            {modeManifest.conceptual_count > 0 && (
              <div>
                <dt>概念レコード</dt>
                <dd>{formatNumber(modeManifest.conceptual_count)}件</dd>
              </div>
            )}
            {modeManifest.breakdown.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{formatNumber(item.count)}件</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="filters" aria-label="絞り込み">
          <label>
            <span>キーワード</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="芸能名・イベント・団体"
              type="search"
              value={query}
            />
          </label>
          <div className="filter-grid">
            <label>
              <span>都道府県</span>
              <select
                onChange={(event) => setPrefecture(event.target.value)}
                value={prefecture}
              >
                <option value="all">すべて</option>
                {prefectures.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>位置精度</span>
              <select
                onChange={(event) => setPrecision(event.target.value)}
                value={precision}
              >
                <option value="all">すべて</option>
                {precisions.map((item) => (
                  <option key={item} value={item}>
                    {precisionLabels[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-grid">
            <label>
              <span>収録種別</span>
              <select
                onChange={(event) => setRecordType(event.target.value)}
                value={recordType}
              >
                <option value="all">すべて</option>
                {recordTypes.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabels[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>根拠レイヤー</span>
              <select
                onChange={(event) => setEvidence(event.target.value)}
                value={evidence}
              >
                <option value="all">すべて</option>
                <option value="official">公的資料</option>
                <option value="research">調査データ</option>
                <option value="planned">調査計画</option>
              </select>
            </label>
          </div>
        </section>

        <div className="result-heading">
          <strong>{formatNumber(filtered.length)}件</strong>
          <span>
            検索結果 / 地図 {formatNumber(filteredCollection.features.length)}件
          </span>
        </div>
        <div className="result-list">
          {loading ? (
            <p className="list-message">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="list-message">条件に一致するレコードがない。</p>
          ) : (
            <>
              {visibleRecords.map((item) => (
                <button
                  className={
                    selectedRecord?.entity_id === item.entity_id
                      ? "selected"
                      : ""
                  }
                  key={item.entity_id}
                  onClick={() => selectRecord(item.entity_id)}
                  type="button"
                >
                  <span className="result-type">
                    {categoryLabels[item.record_type] ?? item.record_type}
                  </span>
                  <strong>{item.title}</strong>
                  <small>
                    {getLocationLabel(item)} /{" "}
                    {precisionLabels[item.location_precision] ??
                      item.location_precision}
                  </small>
                </button>
              ))}
              {visibleCount < filtered.length && (
                <button
                  className="load-more"
                  onClick={() => setVisibleCount((count) => count + 200)}
                  type="button"
                >
                  次の200件を表示
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <section className="map-stage">
        <MapCanvas
          data={filteredCollection}
          mode={mode}
          onSelect={selectRecord}
          selectedFeature={selectedFeature}
        />
        <div className={`map-legend mode-${mode}`}>
          <span />
          {modeShortLabels[mode]}・地図{" "}
          {formatNumber(filteredCollection.features.length)}件 / 全{" "}
          {formatNumber(filtered.length)}件
        </div>
        <div className="dataset-stamp">
          DATA {manifest.dataset_version} / {manifest.generated_at}
        </div>
      </section>

      <DetailPanel
        detail={detail}
        loading={detailLoading}
        manifest={manifest}
        onClose={() => {
          detailRequestId.current += 1;
          setDetailLoading(false);
          setSelectedRecord(null);
          setDetail(null);
        }}
        onSelectRecord={selectRecord}
        record={selectedRecord}
      />
    </main>
  );
}
