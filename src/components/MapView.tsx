import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapSidebar from './MapSidebar';
import type { MapPoint } from '../types';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function FitBounds({ points, enabled }: { points: MapPoint[]; enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || points.length === 0) {
      return;
    }
    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lon]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, points, enabled]);

  return null;
}

const HOLD_MOVE_THRESHOLD_PX = 8;
const DEFAULT_HOLD_DURATION_MS = 1000;

interface HoldProgressState {
  x: number;
  y: number;
  progress: number;
}

function MapHoldProgress({ state }: { state: HoldProgressState | null }) {
  if (!state) {
    return null;
  }

  const size = 44;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - state.progress);

  return (
    <div
      className="map-hold-progress"
      style={{ left: state.x, top: state.y }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="map-hold-progress-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="map-hold-progress-ring"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
    </div>
  );
}

interface MapInteractionHandlerProps {
  onMapClick?: (lat: number, lon: number) => void;
  mode: 'click' | 'hold';
  holdDurationMs: number;
  holdMouseButton: 'left' | 'right';
  onHoldProgress: (state: HoldProgressState | null) => void;
}

function MapInteractionHandler({
  onMapClick,
  mode,
  holdDurationMs,
  holdMouseButton,
  onHoldProgress,
}: MapInteractionHandlerProps) {
  const holdButton = holdMouseButton === 'right' ? 2 : 0;
  const map = useMap();
  const holdRef = useRef<{
    startX: number;
    startY: number;
    lat: number;
    lon: number;
    startTime: number;
    rafId: number;
  } | null>(null);

  const cancelHold = useCallback(() => {
    const activeHold = holdRef.current;
    if (!activeHold) {
      return;
    }

    cancelAnimationFrame(activeHold.rafId);
    holdRef.current = null;
    if (holdMouseButton !== 'right') {
      map.dragging.enable();
    }
    onHoldProgress(null);
  }, [holdMouseButton, map, onHoldProgress]);

  const startHold = useCallback(
    (clientX: number, clientY: number, lat: number, lon: number) => {
      cancelHold();
      if (holdMouseButton !== 'right') {
        map.dragging.disable();
      }

      const hold = {
        startX: clientX,
        startY: clientY,
        lat,
        lon,
        startTime: performance.now(),
        rafId: 0,
      };
      holdRef.current = hold;
      onHoldProgress({ x: clientX, y: clientY, progress: 0 });

      const tick = (now: number) => {
        const activeHold = holdRef.current;
        if (!activeHold) {
          return;
        }

        const progress = Math.min((now - activeHold.startTime) / holdDurationMs, 1);
        onHoldProgress({
          x: activeHold.startX,
          y: activeHold.startY,
          progress,
        });

        if (progress >= 1) {
          const { lat: holdLat, lon: holdLon } = activeHold;
          holdRef.current = null;
          if (holdMouseButton !== 'right') {
            map.dragging.enable();
          }
          onHoldProgress(null);
          onMapClick?.(holdLat, holdLon);
          return;
        }

        activeHold.rafId = requestAnimationFrame(tick);
      };

      hold.rafId = requestAnimationFrame(tick);
    },
    [cancelHold, holdDurationMs, holdMouseButton, map, onHoldProgress, onMapClick],
  );

  const checkHoldMovement = useCallback(
    (clientX: number, clientY: number) => {
      const activeHold = holdRef.current;
      if (!activeHold) {
        return;
      }

      const dx = clientX - activeHold.startX;
      const dy = clientY - activeHold.startY;
      if (Math.hypot(dx, dy) > HOLD_MOVE_THRESHOLD_PX) {
        cancelHold();
      }
    },
    [cancelHold],
  );

  useEffect(() => {
    const endHold = () => {
      if (holdRef.current) {
        cancelHold();
      }
    };

    document.addEventListener('mouseup', endHold);
    document.addEventListener('touchend', endHold);
    document.addEventListener('touchcancel', endHold);

    return () => {
      document.removeEventListener('mouseup', endHold);
      document.removeEventListener('touchend', endHold);
      document.removeEventListener('touchcancel', endHold);
      if (holdRef.current) {
        cancelAnimationFrame(holdRef.current.rafId);
        holdRef.current = null;
        if (holdMouseButton !== 'right') {
          map.dragging.enable();
        }
      }
    };
  }, [cancelHold, holdMouseButton, map]);

  useMapEvents({
    click(event) {
      if (mode === 'click') {
        onMapClick?.(event.latlng.lat, event.latlng.lng);
      }
    },
    mousedown(event) {
      if (mode !== 'hold') {
        return;
      }

      const original = event.originalEvent;
      if (original instanceof MouseEvent && original.button !== holdButton) {
        return;
      }

      startHold(original.clientX, original.clientY, event.latlng.lat, event.latlng.lng);
    },
    mousemove(event) {
      if (mode !== 'hold') {
        return;
      }

      const original = event.originalEvent;
      checkHoldMovement(original.clientX, original.clientY);
    },
  });

  useEffect(() => {
    if (mode !== 'hold' || holdMouseButton !== 'right') {
      return;
    }

    const container = map.getContainer();
    const preventContextMenu = (event: Event) => {
      event.preventDefault();
    };

    container.addEventListener('contextmenu', preventContextMenu);

    return () => {
      container.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [holdMouseButton, map, mode]);

  useEffect(() => {
    if (mode !== 'hold') {
      return;
    }

    const container = map.getContainer();

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const latLng = map.containerPointToLatLng(
        L.point(touch.clientX - rect.left, touch.clientY - rect.top),
      );
      startHold(touch.clientX, touch.clientY, latLng.lat, latLng.lng);
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      checkHoldMovement(touch.clientX, touch.clientY);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
    };
  }, [checkHoldMovement, map, mode, startHold]);

  return null;
}

interface MapContentProps {
  points: MapPoint[];
  interactive: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  mapInteraction?: 'click' | 'hold';
  holdDurationMs?: number;
  holdMouseButton?: 'left' | 'right';
  defaultCenter?: [number, number];
  defaultZoom?: number;
  fitBoundsToPoints?: boolean;
}

function MapContent({
  points,
  interactive,
  onMapClick,
  mapInteraction = 'click',
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  holdMouseButton = 'left',
  defaultCenter = [51.505, -0.09],
  defaultZoom = 6,
  fitBoundsToPoints = true,
}: MapContentProps) {
  const [holdProgress, setHoldProgress] = useState<HoldProgressState | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) {
      return defaultCenter;
    }
    const avgLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
    const avgLon = points.reduce((sum, point) => sum + point.lon, 0) / points.length;
    return [avgLat, avgLon];
  }, [points, defaultCenter]);

  return (
    <>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        boxZoom={interactive}
        keyboard={interactive}
        zoomControl={interactive}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onMapClick && (
          <MapInteractionHandler
            mode={mapInteraction}
            holdDurationMs={holdDurationMs}
            holdMouseButton={holdMouseButton}
            onMapClick={onMapClick}
            onHoldProgress={setHoldProgress}
          />
        )}
        <FitBounds points={points} enabled={fitBoundsToPoints} />
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lon]}
            radius={6}
            pathOptions={{
              color: point.color ?? '#2563eb',
              fillColor: point.color ?? '#2563eb',
              fillOpacity: 0.8,
            }}
          >
            {point.label && (
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                {point.label}
              </Tooltip>
            )}
            {(point.label || point.imageUrl) && (
              <Popup>
                <div className="map-popup">
                  {point.label && <p className="map-popup-label">{point.label}</p>}
                  {point.imageUrl && (
                    <img
                      src={point.imageUrl}
                      alt={point.label ?? 'Custom POI'}
                      className="map-popup-image"
                    />
                  )}
                </div>
              </Popup>
            )}
          </CircleMarker>
        ))}
      </MapContainer>
      {mapInteraction === 'hold' && <MapHoldProgress state={holdProgress} />}
    </>
  );
}

interface MapViewProps {
  points: MapPoint[];
  height?: string;
  emptyMessage?: string;
  expandable?: boolean;
  title?: string;
  onMapClick?: (lat: number, lon: number) => void;
  mapInteraction?: 'click' | 'hold';
  holdDurationMs?: number;
  holdMouseButton?: 'left' | 'right';
  alwaysShowMap?: boolean;
  defaultCenter?: [number, number];
  defaultZoom?: number;
  fitBoundsToPoints?: boolean;
}

export default function MapView({
  points,
  height = '400px',
  emptyMessage = 'No points to display',
  expandable = true,
  title = 'Map',
  onMapClick,
  mapInteraction = 'click',
  holdDurationMs = DEFAULT_HOLD_DURATION_MS,
  holdMouseButton = 'left',
  alwaysShowMap = false,
  defaultCenter,
  defaultZoom,
  fitBoundsToPoints,
}: MapViewProps) {
  const [expanded, setExpanded] = useState(false);

  if (points.length === 0 && !alwaysShowMap) {
    return (
      <div className="map-empty" style={{ height }}>
        {emptyMessage}
      </div>
    );
  }

  if (!expandable) {
    return (
      <div className="map-container" style={{ height }}>
        <MapContent
          points={points}
          interactive
          onMapClick={onMapClick}
          mapInteraction={mapInteraction}
          holdDurationMs={holdDurationMs}
          holdMouseButton={holdMouseButton}
          defaultCenter={defaultCenter}
          defaultZoom={defaultZoom}
          fitBoundsToPoints={fitBoundsToPoints}
        />
      </div>
    );
  }

  return (
    <>
      <div className="map-container map-container-preview" style={{ height }}>
        <MapContent points={points} interactive={false} />
        <div className="map-preview-overlay" aria-hidden="true">
          <span className="map-preview-icon">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </span>
        </div>
        <button
          type="button"
          className="map-preview-open"
          aria-label="Open map"
          onClick={() => setExpanded(true)}
        />
      </div>

      <MapSidebar isOpen={expanded} onClose={() => setExpanded(false)} title={title}>
        <div className="map-container" style={{ height: '100%' }}>
          <MapContent key="expanded-map" points={points} interactive />
        </div>
      </MapSidebar>
    </>
  );
}
