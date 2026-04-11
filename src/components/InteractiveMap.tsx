import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Source, Layer, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

// ── Types ────────────────────────────────────────────────────────────────────
interface CheckpointCoord {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
}

interface InteractiveMapProps {
  checkpoints: CheckpointCoord[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function getCameraFromProgress(
  checkpoints: CheckpointCoord[],
  progress: number
): { lat: number; lng: number } {
  if (checkpoints.length === 0) return { lat: -7.5, lng: 112.5 };
  if (checkpoints.length === 1) return { lat: checkpoints[0].lat, lng: checkpoints[0].lng };

  const segmentCount = checkpoints.length - 1;
  const segmentLength = 1 / segmentCount;
  const rawIndex = progress / segmentLength;
  const segIdx = Math.min(Math.floor(rawIndex), segmentCount - 1);
  const localT = (rawIndex - segIdx) / 1; // already 0-1 within segment

  const a = checkpoints[segIdx];
  const b = checkpoints[segIdx + 1];

  return {
    lat: lerp(a.lat, b.lat, localT),
    lng: lerp(a.lng, b.lng, localT),
  };
}

// ── Map style (dark minimal, no external tiles) ───────────────────────────────
const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    java: {
      type: 'geojson' as const,
      data: '/java.geojson',
    },
  },
  layers: [
    // background ocean
    {
      id: 'background',
      type: 'background' as const,
      paint: { 'background-color': '#0f0e0d' },
    },
    // island fill
    {
      id: 'java-fill',
      type: 'fill' as const,
      source: 'java',
      paint: {
        'fill-color': '#2a2520',
        'fill-opacity': 0.95,
      },
    },
    // island outline
    {
      id: 'java-outline',
      type: 'line' as const,
      source: 'java',
      paint: {
        'line-color': '#4a4540',
        'line-width': 0.8,
        'line-opacity': 0.7,
      },
    },
  ],
};

// ── Route GeoJSON builder ─────────────────────────────────────────────────────
function buildRouteGeoJSON(checkpoints: CheckpointCoord[]) {
  if (checkpoints.length < 2) return null;
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: checkpoints.map((cp) => [cp.lng, cp.lat]),
    },
    properties: {},
  };
}

function buildMarkersGeoJSON(checkpoints: CheckpointCoord[]) {
  return {
    type: 'FeatureCollection' as const,
    features: checkpoints.map((cp, i) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [cp.lng, cp.lat],
      },
      // id included so we can filter active checkpoint in MapLibre
      properties: { id: cp.id, name: cp.location_name, index: i },
    })),
  };
}

// ── UNIFORM ZOOM ──────────────────────────────────────────────────────────────
const ZOOM = 8.2;

// ── Component ─────────────────────────────────────────────────────────────────
export function InteractiveMap({ checkpoints }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Active checkpoint (for marker highlight) — default to first
  const [activeId, setActiveId] = useState<number>(checkpoints[0]?.id ?? -1);

  const initialCenter =
    checkpoints.length > 0
      ? { lat: checkpoints[0].lat, lng: checkpoints[0].lng }
      : { lat: -7.5, lng: 112.0 };

  const [viewState, setViewState] = useState({
    latitude: initialCenter.lat,
    longitude: initialCenter.lng,
    zoom: ZOOM,
    pitch: 30,
    bearing: 0,
  });

  // ── Listen for scroll events from the content panel ───────────────────────
  const handleScrollEvent = useCallback(
    (e: Event) => {
      if (checkpoints.length < 2) return;
      const { progress } = (e as CustomEvent<{ progress: number }>).detail;
      const camera = getCameraFromProgress(checkpoints, progress);
      setViewState((prev) => ({
        ...prev,
        latitude: camera.lat,
        longitude: camera.lng,
      }));
    },
    [checkpoints]
  );

  // ── Listen for active checkpoint events from AnimatedCheckpointList ────────
  const handleActiveEvent = useCallback((e: Event) => {
    const { id } = (e as CustomEvent<{ id: number }>).detail;
    setActiveId(id);
  }, []);

  useEffect(() => {
    window.addEventListener('ddc:scroll', handleScrollEvent);
    window.addEventListener('ddc:checkpoint-active', handleActiveEvent);
    return () => {
      window.removeEventListener('ddc:scroll', handleScrollEvent);
      window.removeEventListener('ddc:checkpoint-active', handleActiveEvent);
    };
  }, [handleScrollEvent, handleActiveEvent]);

  // ── GeoJSON data ──────────────────────────────────────────────────────────
  const routeGeoJSON = buildRouteGeoJSON(checkpoints);
  const markersGeoJSON = buildMarkersGeoJSON(checkpoints);

  // Active checkpoint as a single-feature GeoJSON for the highlight layers
  const activeCheckpoint = checkpoints.find((cp) => cp.id === activeId) ?? checkpoints[0];
  const activeMarkerGeoJSON = activeCheckpoint
    ? {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [activeCheckpoint.lng, activeCheckpoint.lat],
            },
            properties: { id: activeCheckpoint.id },
          },
        ],
      }
    : null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(e) => setViewState(e.viewState)}
        mapStyle={MAP_STYLE as never}
        onLoad={() => setMapLoaded(true)}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Route line */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            {/* Glow underline */}
            <Layer
              id="route-glow"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 6,
                'line-opacity': 0.15,
                'line-blur': 4,
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
            {/* Dashed line */}
            <Layer
              id="route-dashed"
              type="line"
              paint={{
                'line-color': '#f59e0b',
                'line-width': 2,
                'line-opacity': 0.85,
                'line-dasharray': [2, 3],
              }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </Source>
        )}

        {/* Checkpoint markers — all */}
        <Source id="markers" type="geojson" data={markersGeoJSON}>
          {/* Outer glow */}
          <Layer
            id="markers-glow"
            type="circle"
            paint={{
              'circle-radius': 14,
              'circle-color': '#f59e0b',
              'circle-opacity': 0.12,
              'circle-blur': 1,
            }}
          />
          {/* Main dot */}
          <Layer
            id="markers-dot"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': '#f59e0b',
              'circle-stroke-color': '#1c1917',
              'circle-stroke-width': 2,
            }}
          />
        </Source>

        {/* Active checkpoint highlight — pulsing ring over the active marker */}
        {activeMarkerGeoJSON && (
          <Source id="active-marker" type="geojson" data={activeMarkerGeoJSON}>
            {/* Outer animated glow */}
            <Layer
              id="active-outer-glow"
              type="circle"
              paint={{
                'circle-radius': 26,
                'circle-color': '#f59e0b',
                'circle-opacity': 0.18,
                'circle-blur': 1.2,
              }}
            />
            {/* Inner bright ring */}
            <Layer
              id="active-ring"
              type="circle"
              paint={{
                'circle-radius': 11,
                'circle-color': '#fbbf24',
                'circle-stroke-color': '#fff',
                'circle-stroke-width': 2.5,
                'circle-opacity': 1,
              }}
            />
          </Source>
        )}
      </Map>

      {/* Camera position indicator (for Phase 6 sync debug) */}
      {mapLoaded && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            color: 'rgba(168,162,158,0.6)',
            pointerEvents: 'none',
            lineHeight: 1.6,
          }}
        >
          {viewState.latitude.toFixed(4)}, {viewState.longitude.toFixed(4)}
        </div>
      )}
    </div>
  );
}
