export const POI_TYPE_ORDER = [
  'place_of_worship',
  'monument',
  'obelisk',
  'fountain',
  'sculpture',
  'artwork',
  'milestone',
  'plaque',
  'stile',
  'cave',
  'unknown',
] as const;

export type PoiType = (typeof POI_TYPE_ORDER)[number];

export const POI_TYPE_COLORS: Record<PoiType, string> = {
  place_of_worship: '#9333ea',
  monument: '#7c3aed',
  obelisk: '#0891b2',
  fountain: '#0ea5e9',
  sculpture: '#e11d48',
  artwork: '#db2777',
  milestone: '#16a34a',
  plaque: '#2563eb',
  stile: '#ca8a04',
  cave: '#64748b',
  unknown: '#94a3b8',
};

export const POI_TYPE_LABELS: Record<PoiType, string> = {
  place_of_worship: 'Place of worship',
  monument: 'Monument',
  obelisk: 'Obelisk',
  fountain: 'Fountain',
  sculpture: 'Sculpture',
  artwork: 'Artwork',
  milestone: 'Milestone',
  plaque: 'Plaque',
  stile: 'Stile',
  cave: 'Cave',
  unknown: 'Other',
};

export function normalizePoiType(type: string | null | undefined): PoiType {
  if (type && type in POI_TYPE_COLORS) {
    return type as PoiType;
  }
  return 'unknown';
}

export function poiTypeColor(type: string | null | undefined): string {
  return POI_TYPE_COLORS[normalizePoiType(type)];
}

export function poiDisplayLabel(name: string | null, inscription: string | null): string {
  if (name?.trim()) {
    return name.trim();
  }
  if (inscription?.trim()) {
    const text = inscription.trim();
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  }
  return 'Unnamed point';
}
