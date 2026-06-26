import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ActivityChart from '../components/ActivityChart';
import MapView from '../components/MapView';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../utils/formatDate';
import type { UserActivity } from '../types';

const MAP_LEGEND_ITEMS = [
  { key: 'poiCollected', color: '#2563eb', label: 'Standard POI collected' },
  { key: 'customCollected', color: '#7c3aed', label: 'Custom POI collected' },
  { key: 'customCreatedApproved', color: '#16a34a', label: 'Custom POI created (approved)' },
  { key: 'customCreatedPending', color: '#f59e0b', label: 'Custom POI created (pending)' },
] as const;

function UserDetailPage() {
  const { userId } = useParams();
  const { api } = useAuth();
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!api || !userId) {
      return;
    }

    api
      .getUserActivity(Number(userId))
      .then(setActivity)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [api, userId]);

  const mapPoints = useMemo(() => {
    if (!activity) {
      return [];
    }

    const poiPoints = activity.poiDiscoveries.map((discovery) => ({
      id: `poi-${discovery.poiId}`,
      lat: discovery.lat,
      lon: discovery.lon,
      color: '#2563eb',
      label: discovery.name ?? `POI #${discovery.poiId}`,
    }));

    const collectedCustomPoints = activity.customPoiDiscoveries.map((discovery) => ({
      id: `custom-collected-${discovery.customPoiId}`,
      lat: discovery.lat,
      lon: discovery.lon,
      color: '#7c3aed',
      label: `Collected custom POI #${discovery.customPoiId}`,
    }));

    const createdCustomPoints = activity.ownedCustomPois.map((poi) => ({
      id: `custom-created-${poi.id}`,
      lat: poi.lat,
      lon: poi.lon,
      color: poi.approved ? '#16a34a' : '#f59e0b',
      label: `Created custom POI #${poi.id} (${poi.approved ? 'approved' : 'pending'})`,
      imageUrl: poi.imageUrl,
    }));

    return [...poiPoints, ...collectedCustomPoints, ...createdCustomPoints];
  }, [activity]);

  const mapCounts = useMemo(() => {
    if (!activity) {
      return null;
    }

    const pendingCustomPois = activity.ownedCustomPois.filter((poi) => !poi.approved).length;

    return {
      poiCollected: activity.poiDiscoveries.length,
      customCollected: activity.customPoiDiscoveries.length,
      customCreatedApproved: activity.ownedCustomPois.filter((poi) => poi.approved).length,
      customCreatedPending: pendingCustomPois,
    };
  }, [activity]);

  if (loading) {
    return <p className="page-status">Loading user activity…</p>;
  }

  if (error || !activity) {
    return <p className="error-text">{error ?? 'User not found'}</p>;
  }

  return (
    <div className="page">
      <div className="user-detail-header">
        <Link to="/users" className="back-link">
          ← Back to users
        </Link>
        <h2 className="user-detail-email">{activity.user.email}</h2>
      </div>

      <div className="user-map-layout">
        <section className="section-card">
          <MapView
            points={mapPoints}
            height="420px"
            emptyMessage="No POI activity to display for this user"
          />
        </section>

        {mapCounts && (
          <section className="section-card user-stats-card">
            <h3>User stats</h3>
            <dl className="user-stats-list">
              {activity.user.username && (
                <div className="user-stat">
                  <dt>Username</dt>
                  <dd>{activity.user.username}</dd>
                </div>
              )}
              <div className="user-stat">
                <dt>Joined</dt>
                <dd>{formatDate(activity.user.createdAt)}</dd>
              </div>
            </dl>
            <ul className="user-map-legend">
              {MAP_LEGEND_ITEMS.map((item) => (
                <li key={item.key} className="user-map-legend-item">
                  <span
                    className={`user-map-legend-dot${item.key === 'customCreatedPending' ? ' user-map-legend-dot-dark' : ''}`}
                    style={{ background: item.color }}
                  >
                    {mapCounts[item.key]}
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <ActivityChart data={activity.activity} title="Collection activity" />
    </div>
  );
}

export default UserDetailPage;
