import { useEffect, useRef } from "react";
import maplibregl, {
  GeoJSONSource,
  LngLatBounds,
  type Map,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import type {
  MapMode,
  PointFeature,
  PointFeatureCollection,
} from "../data";

const modeColors: Record<MapMode, string> = {
  arts: "#c45624",
  events: "#1f63a5",
  organizations: "#18776f",
};

const baseStyle: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "paper",
      type: "background",
      paint: { "background-color": "#e8e5de" },
    },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.78,
        "raster-saturation": -0.72,
        "raster-contrast": -0.08,
      },
    },
  ],
};

interface MapCanvasProps {
  data: PointFeatureCollection;
  mode: MapMode;
  selectedFeature: PointFeature | null;
  onSelect: (entityId: string) => void;
}

function fitMapToData(map: Map, data: PointFeatureCollection) {
  if (data.features.length <= 1) return;
  const bounds = new LngLatBounds();
  data.features.forEach((item) => bounds.extend(item.geometry.coordinates));
  map.fitBounds(bounds, {
    padding: { top: 72, right: 56, bottom: 72, left: 56 },
    maxZoom: 8.5,
    duration: 450,
  });
}

export function MapCanvas({
  data,
  mode,
  selectedFeature,
  onSelect,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const mapReadyRef = useRef(false);
  const latestDataRef = useRef(data);
  const latestModeRef = useRef(mode);
  const onSelectRef = useRef(onSelect);

  latestDataRef.current = data;
  latestModeRef.current = mode;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: baseStyle,
      center: [137.4, 37.3],
      zoom: 4.15,
      minZoom: 3,
      maxZoom: 17,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      const currentData = latestDataRef.current;
      const currentMode = latestModeRef.current;
      map.addSource("archive-points", {
        type: "geojson",
        data: currentData as Parameters<GeoJSONSource["setData"]>[0],
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 52,
      });
      map.addLayer({
        id: "archive-clusters",
        type: "circle",
        source: "archive-points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": modeColors[currentMode],
          "circle-opacity": 0.88,
          "circle-stroke-color": "#fffdf7",
          "circle-stroke-width": 2,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            17,
            20,
            22,
            100,
            28,
          ],
        },
      });
      map.addLayer({
        id: "archive-cluster-count",
        type: "symbol",
        source: "archive-points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "archive-point",
        type: "circle",
        source: "archive-points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": modeColors[currentMode],
          "circle-radius": 6,
          "circle-stroke-color": "#fffdf7",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "archive-clusters", async (event) => {
        const cluster = map.queryRenderedFeatures(event.point, {
          layers: ["archive-clusters"],
        })[0] as MapGeoJSONFeature | undefined;
        if (!cluster || cluster.geometry.type !== "Point") return;
        const source = map.getSource("archive-points") as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(
          Number(cluster.properties.cluster_id),
        );
        map.easeTo({
          center: cluster.geometry.coordinates as [number, number],
          zoom,
          duration: 450,
        });
      });

      map.on("click", "archive-point", (event) => {
        const point = event.features?.[0];
        const entityId = point?.properties.entity_id as string | undefined;
        if (entityId) onSelectRef.current(entityId);
      });

      for (const layerId of ["archive-clusters", "archive-point"]) {
        map.on("mouseenter", layerId, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      mapReadyRef.current = true;
      fitMapToData(map, currentData);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      mapReadyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const source = map.getSource("archive-points") as
      | GeoJSONSource
      | undefined;
    if (!source) return;
    source.setData(data as Parameters<GeoJSONSource["setData"]>[0]);
    map.setPaintProperty(
      "archive-clusters",
      "circle-color",
      modeColors[mode],
    );
    map.setPaintProperty("archive-point", "circle-color", modeColors[mode]);
    fitMapToData(map, data);
  }, [data, mode]);

  useEffect(() => {
    if (!selectedFeature || !mapRef.current) return;
    mapRef.current.easeTo({
      center: selectedFeature.geometry.coordinates,
      zoom: Math.max(mapRef.current.getZoom(), 7),
      duration: 500,
    });
  }, [selectedFeature]);

  return <div className="map-canvas" ref={containerRef} />;
}
