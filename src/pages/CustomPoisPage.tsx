import { useEffect, useMemo, useState } from 'react';
import MapView from '../components/MapView';
import MapSidebar from '../components/MapSidebar';
import { useAuth } from '../auth/AuthContext';
import { formatDateTime } from '../utils/formatDate';
import type { CustomPoi, PendingCustomPoi } from '../types';

type Tab = 'map' | 'list' | 'approval';

const PAGE_SIZE = 10;

export default function CustomPoisPage() {
  const { api } = useAuth();
  const [tab, setTab] = useState<Tab>('map');
  const [customPois, setCustomPois] = useState<CustomPoi[]>([]);
  const [pendingPois, setPendingPois] = useState<PendingCustomPoi[]>([]);
  const [listPage, setListPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [mapPoi, setMapPoi] = useState<PendingCustomPoi | null>(null);
  const [mapSidebarOpen, setMapSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!api) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [all, pending] = await Promise.all([api.getCustomPois(), api.getPendingCustomPois()]);
      setCustomPois(all);
      setPendingPois(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load custom POIs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const totalListPages = Math.max(1, Math.ceil(customPois.length / PAGE_SIZE));

  useEffect(() => {
    setListPage((current) => Math.min(current, totalListPages));
  }, [totalListPages]);

  const paginatedPois = useMemo(() => {
    const start = (listPage - 1) * PAGE_SIZE;
    return customPois.slice(start, start + PAGE_SIZE);
  }, [customPois, listPage]);

  const handleApprove = async (id: number) => {
    if (!api) {
      return;
    }

    setApprovingId(id);
    setError(null);

    try {
      await api.approveCustomPoi(id);
      await loadData();
      setMapPoi((current) => (current?.id === id ? null : current));
      setMapSidebarOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve POI');
    } finally {
      setApprovingId(null);
    }
  };

  const allMapPoints = useMemo(
    () =>
      customPois.map((poi) => ({
        id: poi.id,
        lat: poi.lat,
        lon: poi.lon,
        color: poi.approved ? '#16a34a' : '#f59e0b',
        label: `${poi.username ?? `User #${poi.userId}`} · #${poi.id} · ${
          poi.approved ? 'approved' : 'pending'
        }`,
        imageUrl: poi.imageUrl,
      })),
    [customPois],
  );

  if (loading) {
    return <p className="page-status">Loading custom POIs…</p>;
  }

  return (
    <div className="page">
      <div className="tab-bar">
        <button
          type="button"
          className={tab === 'map' ? 'active' : ''}
          onClick={() => setTab('map')}
        >
          Map
        </button>
        <button
          type="button"
          className={tab === 'list' ? 'active' : ''}
          onClick={() => setTab('list')}
        >
          List ({customPois.length})
        </button>
        <button
          type="button"
          className={tab === 'approval' ? 'active' : ''}
          onClick={() => setTab('approval')}
        >
          Needs approval ({pendingPois.length})
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {tab === 'map' && (
        <section className="section-card">
          <MapView points={allMapPoints} height="520px" />
        </section>
      )}

      {tab === 'list' && (
        <div className="table-card poi-list-card">
          <table className="poi-list-table">
            <thead>
              <tr>
                <th aria-hidden="true" />
                <th>ID</th>
                <th>User</th>
                <th>Status</th>
                <th>Discoveries</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPois.length === 0 ? (
                <tr>
                  <td colSpan={6} className="poi-list-empty">
                    No custom POIs found.
                  </td>
                </tr>
              ) : (
                paginatedPois.map((poi) => (
                  <tr key={poi.id}>
                    <td className="poi-list-thumb-cell">
                      {poi.imageUrl ? (
                        <a href={poi.imageUrl} target="_blank" rel="noreferrer">
                          <img
                            src={poi.imageUrl}
                            alt={`Custom POI #${poi.id}`}
                            className="poi-list-thumb"
                            loading="lazy"
                          />
                        </a>
                      ) : (
                        <div className="poi-list-thumb-placeholder">No image</div>
                      )}
                    </td>
                    <td>#{poi.id}</td>
                    <td>{poi.username ?? poi.email}</td>
                    <td>
                      <span className={poi.approved ? 'badge approved' : 'badge pending'}>
                        {poi.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>{poi.discoveryCount}</td>
                    <td>{formatDateTime(poi.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {customPois.length > 0 && (
            <div className="pagination">
              <button
                type="button"
                onClick={() => setListPage((page) => Math.max(1, page - 1))}
                disabled={listPage === 1}
              >
                Previous
              </button>
              <span className="pagination-status">
                Page {listPage} of {totalListPages}
              </span>
              <button
                type="button"
                onClick={() => setListPage((page) => Math.min(totalListPages, page + 1))}
                disabled={listPage === totalListPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'approval' && (
        <div className="approval-list">
          {pendingPois.length === 0 ? (
            <p className="muted">No custom POIs waiting for approval.</p>
          ) : (
            pendingPois.map((poi) => (
              <article key={poi.id} className="approval-list-item">
                <div className="approval-list-image">
                  {poi.imageUrl ? (
                    <a href={poi.imageUrl} target="_blank" rel="noreferrer">
                      <img
                        src={poi.imageUrl}
                        alt={`Custom POI #${poi.id}`}
                        loading="lazy"
                      />
                    </a>
                  ) : (
                    <div className="approval-list-image-placeholder">No image</div>
                  )}
                </div>
                <div className="approval-list-details">
                  <div className="approval-list-header">
                    <h3>Custom POI #{poi.id}</h3>
                    <span className="badge pending">Pending</span>
                  </div>
                  <p>
                    <strong>User:</strong> {poi.username ?? poi.email}
                  </p>
                  <p>
                    <strong>Location:</strong> {poi.lat.toFixed(5)}, {poi.lon.toFixed(5)}
                  </p>
                  <p>
                    <strong>Submitted:</strong> {formatDateTime(poi.createdAt)}
                  </p>
                </div>
                <div className="approval-list-actions">
                  <button
                    type="button"
                    className="view-map-btn"
                    onClick={() => {
                      setMapPoi(poi);
                      setMapSidebarOpen(true);
                    }}
                  >
                    View on map
                  </button>
                  <button
                    type="button"
                    className="approve-btn"
                    onClick={() => void handleApprove(poi.id)}
                    disabled={approvingId === poi.id}
                  >
                    {approvingId === poi.id ? 'Approving…' : 'Approve'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      <MapSidebar
        isOpen={mapSidebarOpen}
        onClose={() => setMapSidebarOpen(false)}
        onClosed={() => setMapPoi(null)}
        title={
          mapPoi ? (
            <div>
              <h3>Custom POI #{mapPoi.id}</h3>
              <p className="muted">
                {mapPoi.lat.toFixed(5)}, {mapPoi.lon.toFixed(5)}
              </p>
            </div>
          ) : (
            'Map'
          )
        }
      >
        {mapPoi && (
          <MapView
            key={mapPoi.id}
            expandable={false}
            points={[
              {
                id: mapPoi.id,
                lat: mapPoi.lat,
                lon: mapPoi.lon,
                color: '#f59e0b',
                label: `Custom POI #${mapPoi.id}`,
                imageUrl: mapPoi.imageUrl,
              },
            ]}
            height="100%"
          />
        )}
      </MapSidebar>
    </div>
  );
}
