import { useState, useEffect, useCallback, useRef } from 'react';
import { useScroll, useMotionValueEvent, useSpring, type MotionValue } from 'framer-motion';
import Map, { Source, Layer, Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useJumpableSpring, SCROLL_CONFIG, getTotalVH, getActiveCheckpointIndex, getCheckpointStartVH } from '../lib/scrollUtils';

// ── Types ────────────────────────────────────────────────────────────────────
interface CheckpointCoord {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
}
interface InteractiveMapProps {
  checkpoints: CheckpointCoord[];
  /** Photo count per checkpoint — drives how long the camera parks at each stop. */
  photoCounts?: number[];
  scrollProgress?: MotionValue<number>;
  onCheckpointClick?: (index: number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// Map camera uses VH-aware math so the camera parks at each checkpoint
// for the duration of ALL its photo slices, then pans to the next checkpoint
// only during the next checkpoint's entry slice.
function buildVirtualCheckpoints(cps: CheckpointCoord[], photoCounts?: number[]) {
  return cps.map((cp, i) => ({
    photos: new Array(photoCounts?.[i] ?? 0)
  }));
}

function getCameraFromProgress(
  cps: CheckpointCoord[],
  photoCounts: number[] | undefined,
  progress: number,
): { lat: number; lng: number } {
  if (cps.length === 0) return { lat: -7.5, lng: 112.5 };
  if (cps.length === 1) return { lat: cps[0].lat, lng: cps[0].lng };

  const virtualCPs = buildVirtualCheckpoints(cps, photoCounts);
  const totalVH = getTotalVH(virtualCPs);
  const vh = progress * totalVH;

  const k = getActiveCheckpointIndex(virtualCPs, vh);
  const startVH = getCheckpointStartVH(virtualCPs, k);
  const { SLICE_VH } = SCROLL_CONFIG;

  // Add a tiny 0.5vh margin to handle floating point inaccuracy when jumping exactly to borders
  if (vh < startVH + SLICE_VH - 0.5) {
    // In transition slice: travel from k-1 → k
    if (k === 0) return { lat: cps[0].lat, lng: cps[0].lng };
    const t = (vh - startVH) / SLICE_VH;
    return {
      lat: lerp(cps[k - 1].lat, cps[k].lat, t),
      lng: lerp(cps[k - 1].lng, cps[k].lng, t),
    };
  }

  // Parked at k
  return { lat: cps[k].lat, lng: cps[k].lng };
}

function getMotoBearing(
  cps: CheckpointCoord[],
  photoCounts: number[] | undefined,
  progress: number,
) {
  if (cps.length < 2) return 0;
  
  const virtualCPs = buildVirtualCheckpoints(cps, photoCounts);
  const totalVH = getTotalVH(virtualCPs);
  const vh = progress * totalVH;

  const k = getActiveCheckpointIndex(virtualCPs, vh);
  const startVH = getCheckpointStartVH(virtualCPs, k);
  const { SLICE_VH } = SCROLL_CONFIG;

  if (vh < startVH + SLICE_VH - 0.5 && k > 0) {
    // During travel from k-1 to k
    return getBearing(cps[k - 1], cps[k]);
  }
  
  // Parked at k, look toward next checkpoint
  if (k < cps.length - 1) {
    return getBearing(cps[k], cps[k + 1]);
  }
  
  // Parked at the last one
  return getBearing(cps[k - 1], cps[k]);
}

function getBearing(a: CheckpointCoord, b: CheckpointCoord) {
  const angle = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

// ── Map style ─────────────────────────────────────────────────────────────────
const MAP_STYLE = {
  version: 8 as const,
  glyphs : 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: { java: { type: 'geojson' as const, data: '/java.geojson' } },
  layers : [
    { id: 'background', type: 'background' as const,
      paint: { 'background-color': '#0f0e0d' } },
    { id: 'java-fill', type: 'fill' as const, source: 'java',
      paint: { 'fill-color': '#1e1a18', 'fill-opacity': 0.97 } },
    { id: 'java-outline', type: 'line' as const, source: 'java',
      paint: { 'line-color': '#3d3530', 'line-width': 0.8, 'line-opacity': 0.7 } },
  ],
};

function buildRouteGeoJSON(cps: CheckpointCoord[]) {
  if (cps.length < 2) return null;
  return { type: 'Feature' as const,
    geometry: { type: 'LineString' as const,
      coordinates: cps.map(cp => [cp.lng, cp.lat]) }, properties: {} };
}

function buildMarkersGeoJSON(cps: CheckpointCoord[]) {
  return { type: 'FeatureCollection' as const,
    features: cps.map((cp, i) => ({ type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [cp.lng, cp.lat] },
      properties: { id: cp.id, name: cp.location_name, index: i } })) };
}

// ── Camera padding hook (left-half focus on desktop, top-half on mobile) ─────
interface Padding { top: number; right: number; bottom: number; left: number }

function useCameraPadding(): Padding {
  const [pad, setPad] = useState<Padding>({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPad(w >= 768
        // Desktop: photos cover right 45% → offset camera into left half
        ? { top: 0, right: Math.round(w * 0.45), bottom: 0, left: 0 }
        // Mobile: photos + info cover bottom 55% → offset camera into top 45%
        : { top: 0, right: 0, bottom: Math.round(h * 0.55), left: 0 }
      );
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return pad;
}

const ZOOM = 7.5;

// ── Component ─────────────────────────────────────────────────────────────────
export function InteractiveMap({ checkpoints, photoCounts, scrollProgress, onCheckpointClick }: InteractiveMapProps) {
  const mapRef     = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const cameraPad  = useCameraPadding();

  const init = checkpoints[0]
    ? { lat: checkpoints[0].lat, lng: checkpoints[0].lng }
    : { lat: -7.5, lng: 112.0 };

  const [viewState, setViewState] = useState({
    latitude : init.lat,
    longitude: init.lng,
    zoom     : ZOOM,
    pitch    : 40,
    bearing  : 0,
  });

  const [motoPos, setMotoPos] = useState({ lat: init.lat, lng: init.lng, bearing: 0 });
  const [activeId, setActiveId] = useState<number>(checkpoints[0]?.id ?? -1);

  const fallbackScroll = useScroll(); // Automatically tracks global window layout scroll depth
  const scrollYProgress = scrollProgress || fallbackScroll.scrollYProgress;
  const smoothProgress = useJumpableSpring(scrollYProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001
  });

  useMotionValueEvent(smoothProgress, "change", (progress) => {
    if (checkpoints.length < 2) return;
    const pos     = getCameraFromProgress(checkpoints, photoCounts, progress);
    const bearing = getMotoBearing(checkpoints, photoCounts, progress);
    setViewState(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
    setMotoPos({ lat: pos.lat, lng: pos.lng, bearing });
  });

  const handleActive = useCallback((e: Event) => {
    setActiveId((e as CustomEvent<{ id: number }>).detail.id);
  }, []);

  useEffect(() => {
    window.addEventListener('ddc:checkpoint-active', handleActive);
    return () => {
      window.removeEventListener('ddc:checkpoint-active', handleActive);
    };
  }, [handleActive]);

  const routeGeoJSON     = buildRouteGeoJSON(checkpoints);
  const markersGeoJSON   = buildMarkersGeoJSON(checkpoints);
  const activeCp         = checkpoints.find(cp => cp.id === activeId) ?? checkpoints[0];
  const activeGeoJSON    = activeCp ? {
    type: 'FeatureCollection' as const,
    features: [{ type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [activeCp.lng, activeCp.lat] },
      properties: { id: activeCp.id } }],
  } : null;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Map
        {...viewState}
        // Camera padding: keeps motorcycle in left (desktop) or top (mobile) portion
        padding={cameraPad}
        mapStyle={MAP_STYLE as never}
        onLoad={() => setMapLoaded(true)}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        style={{ width: '100%', height: '100%', cursor: 'default' }}
      >
        {/* Route */}
        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer id="route-glow" type="line"
              paint={{ 'line-color':'#f59e0b','line-width':8,'line-opacity':0.1,'line-blur':8 }}
              layout={{ 'line-cap':'round','line-join':'round' }} />
            <Layer id="route-dashed" type="line"
              paint={{ 'line-color':'#f59e0b','line-width':2,'line-opacity':0.65,
                'line-dasharray':[2,3] }}
              layout={{ 'line-cap':'round','line-join':'round' }} />
          </Source>
        )}

        {/* All checkpoint dots — now using interactive Markers for clicking */}
        {checkpoints.map((cp, i) => (
          <Marker 
            key={`cp-marker-${cp.id}`}
            longitude={cp.lng} 
            latitude={cp.lat} 
            anchor="center"
          >
            <button
              onClick={() => onCheckpointClick?.(i)}
              className="map-checkpoint-dot"
              title={cp.location_name}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                pointerEvents: 'auto',
                padding: 0,
              }}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#f59e0b',
                border: '2px solid #1c1917',
                boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)',
              }} />
            </button>
          </Marker>
        ))}

        {/* Active checkpoint highlight ring */}
        {activeGeoJSON && (
          <Source id="active-marker" type="geojson" data={activeGeoJSON}>
            <Layer id="active-glow" type="circle"
              paint={{ 'circle-radius':28,'circle-color':'#f59e0b',
                'circle-opacity':0.15,'circle-blur':1.5 }} />
            <Layer id="active-ring" type="circle"
              paint={{ 'circle-radius':10,'circle-color':'#fbbf24',
                'circle-stroke-color':'#fff','circle-stroke-width':2.5 }} />
          </Source>
        )}

        {/* Motorcycle marker — moves with scroll progress */}
        {mapLoaded && (
          <Marker longitude={motoPos.lng} latitude={motoPos.lat} anchor="center">
            <div className="moto-marker" style={{ transform: `rotate(${motoPos.bearing}deg)` }}>
              🏍️
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
