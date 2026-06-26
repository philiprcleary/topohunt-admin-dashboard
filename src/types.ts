export interface AdminUser {
  id: number;
  username: string | null;
  email: string;
  created_at: string;
  poi_discoveries: number;
  custom_poi_discoveries: number;
  custom_pois_created: number;
}

export interface MapPoint {
  id: number | string;
  lat: number;
  lon: number;
  label?: string;
  color?: string;
  imageUrl?: string | null;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface ActivityInRangePoint {
  date: string;
  poiDiscovered: number;
  customPoiDiscovered: number;
  customPoiCreated: number;
}

export interface ActivityEvent {
  id: number;
  type: 'poi' | 'custom_poi' | 'custom_poi_created';
  lat: number;
  lon: number;
  userId: number;
  username: string | null;
  name: string | null;
  imageUrl: string | null;
  createdAt: string;
}

export interface ActivityRangeData {
  events: ActivityEvent[];
  activity: ActivityInRangePoint[];
}

export interface UserActivity {
  user: {
    id: number;
    username: string | null;
    email: string;
    createdAt: string;
    poiDiscoveries: number;
    customPoiDiscoveries: number;
    customPoisCreated: number;
  };
  poiDiscoveries: {
    poiId: number;
    lat: number;
    lon: number;
    name: string | null;
    createdAt: string;
  }[];
  customPoiDiscoveries: {
    customPoiId: number;
    lat: number;
    lon: number;
    createdAt: string;
  }[];
  ownedCustomPois: {
    id: number;
    lat: number;
    lon: number;
    imageUrl: string | null;
    approved: boolean;
    approvalDate: string | null;
    createdAt: string;
    discoveryCount: number;
  }[];
  activity: ActivityPoint[];
}

export interface DiscoveryInRange {
  id: number;
  type: 'poi' | 'custom_poi';
  lat: number;
  lon: number;
  userId: number;
  username: string | null;
  name: string | null;
  createdAt: string;
}

export interface CustomPoi {
  id: number;
  userId: number;
  username: string | null;
  email: string;
  lat: number;
  lon: number;
  imageUrl: string | null;
  approved: boolean;
  approvalDate: string | null;
  createdAt: string;
  discoveryCount: number;
}

export interface PendingCustomPoi {
  id: number;
  userId: number;
  username: string | null;
  email: string;
  lat: number;
  lon: number;
  imageUrl: string | null;
  createdAt: string;
}

export interface StandardPoi {
  id: number;
  lat: number;
  lon: number;
  name: string | null;
  inscription: string | null;
  poiType: string | null;
  h3Index: string;
}

export interface NearbyPoisResponse {
  centerH3Index: string;
  surroundingH3Indexes: string[];
  pois: StandardPoi[];
}
