import { useEffect, useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import ActivityChart, { type ChartSeries } from '../components/ActivityChart';
import DateRangeSelector, { endOfUtcDay, startOfUtcDay } from '../components/DateRangeSelector';
import MapView from '../components/MapView';
import { useAuth } from '../auth/AuthContext';
import { formatDateTime } from '../utils/formatDate';
import type { ActivityEvent, ActivityInRangePoint } from '../types';

type ActivityEventType = ActivityEvent['type'];
type EventFilter = 'all' | ActivityEventType;

const EVENT_TYPES: {
  type: ActivityEventType;
  color: string;
  label: string;
  chartKey: keyof ActivityInRangePoint;
}[] = [
  { type: 'poi', color: '#2563eb', label: 'Point discovered', chartKey: 'poiDiscovered' },
  {
    type: 'custom_poi',
    color: '#7c3aed',
    label: 'Custom POI discovered',
    chartKey: 'customPoiDiscovered',
  },
  {
    type: 'custom_poi_created',
    color: '#16a34a',
    label: 'Custom POI created',
    chartKey: 'customPoiCreated',
  },
];

function eventLabel(event: ActivityEvent): string {
  if (event.type === 'poi') {
    return event.name ?? `POI #${event.id}`;
  }
  if (event.type === 'custom_poi') {
    return `Custom POI #${event.id} discovered`;
  }
  return `Custom POI #${event.id} created`;
}

export default function GeneralActivityPage() {
  const { api } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [activity, setActivity] = useState<ActivityInRangePoint[]>([]);
  const [dateRange, setDateRange] = useState(() => ({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  }));
  const [eventFilter, setEventFilter] = useState<EventFilter>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!api) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const from = startOfUtcDay(dateRange.startDate);
      const to = endOfUtcDay(dateRange.endDate);
      const data = await api.getActivityInRange(from.toISOString(), to.toISOString());
      setEvents(data.events);
      setActivity(data.activity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, dateRange.startDate, dateRange.endDate]);

  const filteredEvents = useMemo(
    () => (eventFilter === 'all' ? events : events.filter((event) => event.type === eventFilter)),
    [events, eventFilter],
  );

  const eventCounts = useMemo(() => {
    const counts = {
      all: events.length,
      poi: 0,
      custom_poi: 0,
      custom_poi_created: 0,
    };

    for (const event of events) {
      counts[event.type] += 1;
    }

    return counts;
  }, [events]);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    const types =
      eventFilter === 'all'
        ? EVENT_TYPES
        : EVENT_TYPES.filter((item) => item.type === eventFilter);

    return types.map((item) => ({
      dataKey: item.chartKey,
      color: item.color,
      name: item.label,
    }));
  }, [eventFilter]);

  const mapPoints = useMemo(
    () =>
      filteredEvents.map((event) => {
        const config = EVENT_TYPES.find((item) => item.type === event.type);
        return {
          id: `${event.type}-${event.id}-${event.userId}-${event.createdAt}`,
          lat: event.lat,
          lon: event.lon,
          color: config?.color ?? '#2563eb',
          label: `${event.username ?? `User #${event.userId}`} · ${eventLabel(event)} · ${formatDateTime(event.createdAt)}`,
          imageUrl: event.imageUrl,
        };
      }),
    [filteredEvents],
  );

  if (loading && events.length === 0) {
    return <p className="page-status">Loading activity…</p>;
  }

  return (
    <div className="page">
      {error && <p className="error-text">{error}</p>}

      <div className="activity-controls-layout">
        <section className="section-card date-range-card">
          <DateRangeSelector
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(startDate, endDate) => setDateRange({ startDate, endDate })}
          />
        </section>

        <section className="section-card event-type-card">
          <h3>Event types</h3>
          <ul className="event-type-list">
            <li>
              <button
                type="button"
                className={eventFilter === 'all' ? 'active' : ''}
                onClick={() => setEventFilter('all')}
              >
                <span className="event-type-list-label">All</span>
                <span className="event-type-count">{eventCounts.all}</span>
              </button>
            </li>
            {EVENT_TYPES.map((item) => (
              <li key={item.type}>
                <button
                  type="button"
                  className={eventFilter === item.type ? 'active' : ''}
                  onClick={() => setEventFilter(item.type)}
                >
                  <span className="event-type-list-label">
                    <span className="map-legend-swatch" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <span className="event-type-count">{eventCounts[item.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ActivityChart
        data={activity}
        series={chartSeries}
        title="Activity over time"
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />

      <section className="section-card">
        <p className="muted">{filteredEvents.length} events in selected range</p>
        <MapView points={mapPoints} height="480px" emptyMessage="No events in selected range" />
      </section>
    </div>
  );
}
