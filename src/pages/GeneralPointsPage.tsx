import { useMemo, useState } from 'react';
import MapView from '../components/MapView';
import { useAuth } from '../auth/AuthContext';
import type { StandardPoi, MapPoint } from '../types';
import {
  POI_TYPE_LABELS,
  POI_TYPE_ORDER,
  normalizePoiType,
  poiDisplayLabel,
  poiTypeColor,
  type PoiType,
} from '../utils/poiTypeColors';

export default function GeneralPointsPage() {
  const { api } = useAuth();
  const [pois, setPois] = useState<StandardPoi[]>([]);
  const [clickLocation, setClickLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [enabledTypes, setEnabledTypes] = useState<Set<PoiType>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedArea, setLoadedArea] = useState<string | null>(null);

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

  const mapPoints = useMemo((): MapPoint[] => {
    const points: MapPoint[] = filteredPois.map((poi) => ({
      id: poi.id,
      lat: poi.lat,
      lon: poi.lon,
      color: poiTypeColor(poi.poiType),
      label: poiDisplayLabel(poi.name, poi.inscription),
    }));

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
  }, [filteredPois, clickLocation]);

  return (
    <div className="page">
      {error && <p className="error-text">{error}</p>}

      <div className="general-points-layout">
        <section className="section-card general-points-map-card">
          <p className="muted general-points-hint">
            Right-click and hold anywhere on the map to load standard points in that hexagon and its
            neighbours.
            {loading && ' Loading…'}
          </p>
          <MapView
            points={mapPoints}
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
                  {pois.length} points · H3 {loadedArea}
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
