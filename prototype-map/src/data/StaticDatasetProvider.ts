import type {
  DatasetManifest,
  FeatureDetail,
  MapDataProvider,
  MapMode,
  MapRecord,
  PointFeatureCollection,
} from "./contracts";

interface DatasetPointer {
  dataset_version: string;
  manifest: string;
}

export class StaticDatasetProvider implements MapDataProvider {
  private manifestPromise: Promise<DatasetManifest> | null = null;
  private datasetRoot: URL | null = null;
  private detailsCache = new Map<string, Record<string, FeatureDetail>>();

  constructor(
    private readonly baseUrl = new URL(
      `${import.meta.env.BASE_URL}datasets/`,
      window.location.href,
    ),
  ) {}

  async loadManifest(): Promise<DatasetManifest> {
    if (!this.manifestPromise) {
      this.manifestPromise = this.fetchManifest();
    }
    return this.manifestPromise;
  }

  async loadRecords(mode: MapMode): Promise<MapRecord[]> {
    const manifest = await this.loadManifest();
    const url = new URL(
      manifest.modes[mode].records,
      this.requireDatasetRoot(),
    );
    return this.fetchJson<MapRecord[]>(url);
  }

  async loadFeatures(mode: MapMode): Promise<PointFeatureCollection> {
    const manifest = await this.loadManifest();
    const url = new URL(manifest.modes[mode].geojson, this.requireDatasetRoot());
    return this.fetchJson<PointFeatureCollection>(url);
  }

  async loadDetail(
    mode: MapMode,
    detailId: string,
    detailShard: string,
  ): Promise<FeatureDetail | null> {
    const cacheKey = `${mode}:${detailShard}`;
    if (!this.detailsCache.has(cacheKey)) {
      const manifest = await this.loadManifest();
      const relativePath = manifest.modes[mode].details.replace(
        "{shard}",
        detailShard,
      );
      const url = new URL(relativePath, this.requireDatasetRoot());
      this.detailsCache.set(
        cacheKey,
        await this.fetchJson<Record<string, FeatureDetail>>(url),
      );
    }
    return this.detailsCache.get(cacheKey)?.[detailId] ?? null;
  }

  private async fetchManifest(): Promise<DatasetManifest> {
    const pointer = await this.fetchJson<DatasetPointer>(
      new URL("current.json", this.baseUrl),
    );
    const manifestUrl = new URL(pointer.manifest, this.baseUrl);
    this.datasetRoot = new URL(".", manifestUrl);
    return this.fetchJson<DatasetManifest>(manifestUrl);
  }

  private requireDatasetRoot(): URL {
    if (!this.datasetRoot) {
      throw new Error("Dataset manifest has not been loaded.");
    }
    return this.datasetRoot;
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }
    return response.json() as Promise<T>;
  }
}
