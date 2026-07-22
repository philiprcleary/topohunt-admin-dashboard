import { useMemo, useState } from 'react';
import MapView from '../components/MapView';
import { useAuth } from '../auth/AuthContext';
import type { StandardPoi, MapPoint, MapPolygon } from '../types';
import {
  POI_TYPE_LABELS,
  POI_TYPE_ORDER,
  normalizePoiType,
  poiDisplayLabel,
  poiTypeColor,
  type PoiType,
} from '../utils/poiTypeColors';
import { groupByHuntHex, huntHexKey, latLonToAxialHex } from '../utils/hentHunHelper';

const BASE_MARKER_RADIUS = 6;
const HIGHLIGHTED_MARKER_RADIUS = 10;

export default function GeneralPointsPage() {
  const { api } = useAuth();
  const [pois, setPois] = useState<StandardPoi[]>([]);
  const [clickLocation, setClickLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<Set<PoiType>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedArea, setLoadedArea] = useState<string | null>(null);
  const [highlightedHexId, setHighlightedHexId] = useState<string | null>(null);

  const toggleType = (type: PoiType) => {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleMapClick = async (lat: number, lon: number) => {
    if (!api) {
      return;
    }

    setClickLocation({ lat, lon });
    setLoading(true);
    setError(null);
    setHighlightedHexId(null);

    try {
      const data = await api.getNearbyPois(lat, lon);
      setPois(data.pois);
      setLoadedArea(data.centerH3Index);
      const types = new Set<PoiType>();
      for (const poi of data.pois) {
        types.add(normalizePoiType(poi.poiType));
      }
      setEnabledTypes(types);
    } catch (err) {
      setPois([]);
      setLoadedArea(null);
      setEnabledTypes(new Set());
      setError(err instanceof Error ? err.message : 'Failed to load points');
    } finally {
      setLoading(false);
    }
  };

  const typeCounts = useMemo(() => {
    const counts = Object.fromEntries(
      POI_TYPE_ORDER.map((type) => [type, 0]),
    ) as Record<PoiType, number>;

    for (const poi of pois) {
      const type = normalizePoiType(poi.poiType);
      counts[type] += 1;
    }

    return counts;
  }, [pois]);

  const visibleTypes = useMemo(
    () => POI_TYPE_ORDER.filter((type) => typeCounts[type] > 0),
    [typeCounts],
  );

  const filteredPois = useMemo(
    () => pois.filter((poi) => enabledTypes.has(normalizePoiType(poi.poiType))),
    [pois, enabledTypes],
  );

  const hexGroups = useMemo(() => groupByHuntHex(filteredPois), [filteredPois]);

  const mapPolygons = useMemo((): MapPolygon[] => {
    return hexGroups.map(({ key, cell }) => ({
      id: key,
      // Hunt hex boundary is [lon, lat]; Leaflet wants [lat, lon].
      positions: cell.boundary.map(([lon, lat]) => [lat, lon] as [number, number]),
      color: '#334155',
      fillColor: '#64748b',
      fillOpacity: 0.06,
      weight: 1.5,
    }));
  }, [hexGroups]);

  const mapPoints = useMemo((): MapPoint[] => {
    const points: MapPoint[] = filteredPois.map((poi) => {
      const { q, r } = latLonToAxialHex(poi.lat, poi.lon);
      const hexId = huntHexKey(q, r);
      const highlighted = highlightedHexId === hexId;

      return {
        id: poi.id,
        lat: poi.lat,
        lon: poi.lon,
        color: poiTypeColor(poi.poiType),
        label: poiDisplayLabel(poi.name, poi.inscription),
        groupId: hexId,
        radius: highlighted ? HIGHLIGHTED_MARKER_RADIUS : BASE_MARKER_RADIUS,
      };
    });

    if (clickLocation) {
      points.push({
        id: 'click-location',
        lat: clickLocation.lat,
        lon: clickLocation.lon,
        color: '#0f172a',
        label: 'Selected location',
      });
    }

    return points;
  }, [filteredPois, clickLocation, highlightedHexId]);

  return (
    <div className="page">
      {error && <p className="error-text">{error}</p>}

      <div className="general-points-layout">
        <section className="section-card general-points-map-card">
          <p className="muted general-points-hint">
            Right-click and hold anywhere on the map to load standard points in that hexagon and its
            neighbours. Hover a hunt hex to highlight its points.
            {loading && ' Loading…'}
          </p>
          <MapView
            points={mapPoints}
            polygons={mapPolygons}
            highlightedPolygonId={highlightedHexId}
            onPolygonHighlight={setHighlightedHexId}
            height="calc(100vh - 180px)"
            expandable={false}
            alwaysShowMap
            mapInteraction="hold"
            holdMouseButton="right"
            onMapClick={(lat, lon) => void handleMapClick(lat, lon)}
            defaultCenter={[54.5, -2.5]}
            defaultZoom={6}
            fitBoundsToPoints={filteredPois.length > 0}
            emptyMessage="Right-click and hold the map to load points"
          />
        </section>

        <section className="section-card poi-type-card">
          <h3>Point types</h3>
          {pois.length === 0 ? (
            <p className="muted">No points loaded yet.</p>
          ) : (
            <>
              {loadedArea && (
                <p className="muted general-points-meta">
                  {pois.length} points · {hexGroups.length} hunt hexes · H3 {loadedArea}
                </p>
              )}
              <ul className="event-type-list">
                {visibleTypes.map((type) => (
                  <li key={type}>
                    <button
                      type="button"
                      className={enabledTypes.has(type) ? 'active' : ''}
                      onClick={() => toggleType(type)}
                    >
                      <span className="event-type-list-label">
                        <span
                          className="map-legend-swatch"
                          style={{ background: poiTypeColor(type) }}
                        />
                        {POI_TYPE_LABELS[type]}
                      </span>
                      <span className="event-type-count">{typeCounts[type]}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="muted general-points-filter-note">
                Showing {filteredPois.length} of {pois.length} points
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
