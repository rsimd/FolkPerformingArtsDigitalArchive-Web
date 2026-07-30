export type MapMode = "arts" | "events" | "organizations";

export interface ModeBreakdown {
  label: string;
  count: number;
}

export interface ModeManifest {
  label: string;
  description: string;
  record_count: number;
  feature_count: number;
  unmapped_count: number;
  breakdown: ModeBreakdown[];
  records: string;
  geojson: string;
  details: string;
}

export interface DatasetSource {
  name: string;
  path: string;
  status: "included" | "superseded_duplicate";
  detail: string;
}

export interface DatasetManifest {
  schema_version: string;
  dataset_version: string;
  generated_at: string;
  title: string;
  coordinate_policy: string;
  deduplication_policy: string;
  modes: Record<MapMode, ModeManifest>;
  sources: DatasetSource[];
  integration?: Record<string, number>;
}

export interface MapRecord {
  entity_id: string;
  detail_id: string;
  detail_shard: string;
  mode: MapMode;
  record_type: string;
  evidence_layer: "official" | "research" | "planned";
  title: string;
  prefecture: string | null;
  municipality: string | null;
  category: string;
  verification_status: string;
  location_precision: string;
  coordinates: [number, number] | null;
  search_text?: string;
  designation_count?: number;
  held_date?: string | null;
  video_count?: number;
  confidence?: string;
  public_video_count?: number;
}

export type MapFeatureProperties = Omit<
  MapRecord,
  "coordinates" | "search_text"
>;

export interface PointFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: MapFeatureProperties;
}

export interface PointFeatureCollection {
  type: "FeatureCollection";
  features: PointFeature[];
}

export type FeatureDetail = Record<string, unknown>;

export interface MapDataProvider {
  loadManifest(): Promise<DatasetManifest>;
  loadRecords(mode: MapMode): Promise<MapRecord[]>;
  loadFeatures(mode: MapMode): Promise<PointFeatureCollection>;
  loadDetail(
    mode: MapMode,
    detailId: string,
    detailShard: string,
  ): Promise<FeatureDetail | null>;
}
