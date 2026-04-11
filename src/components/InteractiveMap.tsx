import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Source, Layer, Marker, type MapRef } from 'react-map-gl/maplibre';
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

  const segmentCount  = checkpoints.length - 1;
  const segmentLength = 1 / segmentCount;
  const rawIndex      = progress / segmentLength;
  const segIdx        = Math.min(Math.floor(rawIndex), segmentCount - 1);
  const localT        = rawIndex - segIdx;

  const a = checkpoints[segIdx];
  const b = checkpoints[segIdx + 1];
  return {
    lat: lerp(a.lat, b.lat, localT),
    lng: lerp(a.lng, b.lng, localT),
  };
}

// Compass bearing (degrees clockwise from north) between two points
function getBearing(
  from: CheckpointCoord,
  to: CheckpointCoord
): number {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function getMotoBearing(
  checkpoints: CheckpointCoord[],
  progress: number
): number {
  if (checkpoints.length < 2) return 0;
  const segCount = checkpoints.length - 1;
  const segSize  = 1 / segCount;
  const segIdx   = Math.min(Math.floor(progress / segSize), segCount - 1);
  return getBearing(checkpoints[segIdx], checkpoints[segIdx + 1]);
}

// ── Map style (dark minimal) ─────────────────────────────────────────────────
const MAP_STYLE = {
  version: 8 as const,
  glyphs : 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    java: { type: 'geojson' as const, data: '/java.geojson' },
  },
  layers: [
    { id: 'background', type: 'background' as const,
      paint: { 'background-color': '#0f0e0d' } },
    { id: 'java-fill', type: 'fill' as const, source: 'java',
      paint: { 'fill-color': '#1e1a18', 'fill-opacity': 0.97 } },
    { id: 'java-outline', type: 'line' as const, source: 'java',
      paint: { 'line-color': '#3d3530', 'line-width': 0.8, 'line-opacity': 0.7 } },
  ],
};

// ── GeoJSON builders ─────────────────────────────────────────────────────────
function buildRouteGeoJSON(checkpoints: CheckpointCoord[]) {
  if (checkpoints.length < 2) return null;
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const,
      coordinates: checkpoints.map((cp) => [cp.lng, cp.lat]) },
    properties: {},
  };
}

function buildMarkersGeoJSON(checkpoints: CheckpointCoord[]) {
  return {
    type: 'FeatureCollection' as const,
    features: checkpoints.map((cp, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const,
        coordinates: [cp.lng, cp.lat] },
      properties: { id: cp.id, name: cp.location_name, index: i },
    })),
  };
}

// ── Constants ────────────────────────────────────────────────────────────────
const ZOOM = 8.5;

// ── Component ─────────────────────────────────────────────────────────────────
export function InteractiveMap({ checkpoints }: InteractiveMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const initialCenter = checkpoints.length > 0
    ? { lat: checkpoints[0].lat, lng: checkpoints[0].lng }
    : { lat: -7.5, lng: 112.0 };

  const [viewState, setViewState] = useState({
    latitude : initialCenter.lat,
    longitude: initialCenter.lng,
    zoom     : ZOOM,
    pitch    : 40,
    bearing  : 0,
  });

  // Motorcycle position + bearing tracks the scroll-interpolated path
  const [motoPos, setMotoPos] = useState({
    lat    : initialCenter.lat,
    lng    : initialCenter.lng,
    bearing: 0,
  });

  // Active checkpoint highlight (driven by ddc:checkpoint-active)
  const [activeId, setActiveId] = useState<number>(checkpoints[0]?.id ?? -1);

  // ── Listen to ddc:scroll ──────────────────────────────────────────────────
  const handleScroll = useCallback((e: Event) => {
    if (checkpoints.length < 2) return;
    const { progress } = (e as CustomEvent<{ progress: number }>).detail;
    const pos     = getCameraFromProgress(checkpoints, progress);
    const bearing = getMotoBearing(checkpoints, progress);
    setViewState((prev) => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
    setMotoPos({ lat: pos.lat, lng: pos.lng, bearing });
  }, [checkpoints]);

  // ── Listen to ddc:checkpoint-active ──────────────────────────────────────
  const handleActive = useCallback((e: Event) => {
    setActiveId((e as CustomEvent<{ id: number }>).detail.id);
  }, []);

  useEffect(() => {
    window.addEventListener('ddc:scroll', handleScroll);
    window.addEventListener('ddc:checkpoint-active', handleActive);
    return () => {
      window.removeEventListener('ddc:scroll', handleScroll);
      window.removeEventListener('ddc:checkpoint-active', handleActive);
    };
  }, [handleScroll, handleActive]);

  // ── GeoJSON ───────────────────────────────────────────────────────────────
  const routeGeoJSON   = buildRouteGeoJSON(checkpoints);
  const markersGeoJSON = buildMarkersGeoJSON(checkpoints);

  const activeCheckpoint   = checkpoints.find((cp) => cp.id === activeId) ?? checkpoints[0];
  const activeMarkerGeoJSON = activeCheckpoint ? {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: { type: 'Point' as const,
        coordinates: [activeCheckpoint.lng, activeCheckpoint.lat] },
      properties: { id: activeCheckpoint.id },
    }],
  } : null;

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
        {/* ── Route line ─────────────────────────────────────────────── */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer id="route-glow" type="line"
              paint={{ 'line-color': '#f59e0b', 'line-width': 8,
                'line-opacity': 0.12, 'line-blur': 6 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
            <Layer id="route-dashed" type="line"
              paint={{ 'line-color': '#f59e0b', 'line-width': 2,
                'line-opacity': 0.7, 'line-dasharray': [2, 3] }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
          </Source>
        )}

        {/* ── All checkpoint dots ─────────────────────────────────────── */}
        <Source id="markers" type="geojson" data={markersGeoJSON}>
          <Layer id="markers-glow" type="circle"
            paint={{ 'circle-radius': 14, 'circle-color': '#f59e0b',
              'circle-opacity': 0.1, 'circle-blur': 1 }} />
          <Layer id="markers-dot" type="circle"
            paint={{ 'circle-radius': 5, 'circle-color': '#f59e0b',
              'circle-stroke-color': '#1c1917', 'circle-stroke-width': 1.5 }} />
        </Source>

        {/* ── Active checkpoint ring ──────────────────────────────────── */}
        {activeMarkerGeoJSON && (
          <Source id="active-marker" type="geojson" data={activeMarkerGeoJSON}>
            <Layer id="active-outer-glow" type="circle"
              paint={{ 'circle-radius': 28, 'circle-color': '#f59e0b',
                'circle-opacity': 0.15, 'circle-blur': 1.5 }} />
            <Layer id="active-ring" type="circle"
              paint={{ 'circle-radius': 10, 'circle-color': '#fbbf24',
                'circle-stroke-color': '#fff', 'circle-stroke-width': 2.5 }} />
          </Source>
        )}

        {/* ── Motorcycle marker ───────────────────────────────────────── */}
        {mapLoaded && (
          <Marker longitude={motoPos.lng} latitude={motoPos.lat} anchor="center">
            <div
              className="moto-marker"
              style={{ transform: `rotate(${motoPos.bearing}deg)` }}
              title="DDC Motorcycle"
            >
              🏍️
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
