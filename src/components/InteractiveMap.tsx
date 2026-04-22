import { useState, useEffect, useCallback } from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useScroll } from 'framer-motion';
import { useCameraPadding } from '../hooks/useCameraPadding';
import {
  getCameraFromProgress,
  getMotoBearing,
  buildRouteGeoJSON,
  BASE_MAP_STYLE,
  type CheckpointCoord,
} from '../lib/mapUtils';
import { type ScrollableCheckpoint } from '../lib/scrollUtils';

interface InteractiveMapProps {
  checkpoints     : CheckpointCoord[];
  /** Unified timeline source of truth for scrolling interpolation. */
  scrollables     : ScrollableCheckpoint[];
  scrollProgress? : MotionValue<number>;
  onCheckpointClick?: (index: number) => void;
  onMapLoaded?    : () => void;
}

const ZOOM = 7.5;

// ── Component ─────────────────────────────────────────────────────────────────
export function InteractiveMap({ checkpoints, scrollables, scrollProgress, onCheckpointClick, onMapLoaded }: InteractiveMapProps) {
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Track the HTML data-theme attribute to dynamically switch the map style
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const updateTheme = () => {
      setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    };
    
    updateTheme(); // initial check

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, []);

  const fallbackScroll = useScroll(); // Automatically tracks global window layout scroll depth
  const scrollYProgress = scrollProgress || fallbackScroll.scrollYProgress;

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (checkpoints.length < 2) return;
    const pos     = getCameraFromProgress(checkpoints, scrollables, progress);
    const bearing = getMotoBearing(checkpoints, scrollables, progress);
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
  const activeCp         = checkpoints.find(cp => cp.id === activeId) ?? checkpoints[0];
  const activeGeoJSON    = activeCp ? {
    type: 'FeatureCollection' as const,
    features: [{ type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [activeCp.lng, activeCp.lat] },
      properties: { id: activeCp.id } }],
  } : null;

  return (
    <div className="map-container">
      <Map
        {...viewState}
        // Camera padding: keeps motorcycle in left (desktop) or top (mobile) portion
        padding={cameraPad}
        mapStyle={BASE_MAP_STYLE as never}
        onLoad={() => {
          setMapLoaded(true);
          onMapLoaded?.();
        }}
        attributionControl={false}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Declarative Map Background & Island polygon */}
        <Layer 
          id="background" 
          type="background" 
          paint={{ 'background-color': theme === 'light' ? '#e0f2fe' : '#0c0a09' }} 
        />
        <Source id="java" type="geojson" data="/java.geojson">
          <Layer 
            id="java-fill" 
            type="fill" 
            paint={{ 'fill-color': theme === 'light' ? '#ffffff' : '#1c1917', 'fill-opacity': 0.97 }} 
          />
          <Layer 
            id="java-outline" 
            type="line" 
            paint={{ 'line-color': theme === 'light' ? '#cbd5e1' : '#3c3836', 'line-width': 1.2, 'line-opacity': 0.8 }} 
          />
        </Source>
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
            >
              <div className="checkpoint-dot-wrapper">
                <div className="checkpoint-inner-dot" />
              </div>
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
