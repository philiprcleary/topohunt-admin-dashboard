import { calculateDistance } from "./distanceHelper";

/** Mercator lattice scale (centre → corner in projected metres). */
export const HUNT_HEX_SIZE = 500;

export const HUNT_HEX_CIRCUMRADIUS_METERS = HUNT_HEX_SIZE;
export const HUNT_HEX_EDGE_LENGTH_METERS = HUNT_HEX_SIZE;

const MERCATOR_R = 6378137;
const SQRT3 = Math.sqrt(3);

export type AxialHex = { q: number; r: number };

export type HuntHexCell = {
    gridQ: number;
    gridR: number;
    center: [number, number];
    boundary: [number, number][];
};

type Meters = { x: number; y: number };
type CubeHex = { q: number; r: number; s: number };

function latLonToMeters(lat: number, lon: number): Meters {
    return {
        x: (MERCATOR_R * lon * Math.PI) / 180,
        y:
            MERCATOR_R *
            Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
    };
}

function metersToLatLon(x: number, y: number): { lat: number; lon: number } {
    return {
        lat:
            ((2 * Math.atan(Math.exp(y / MERCATOR_R)) - Math.PI / 2) * 180) /
            Math.PI,
        lon: (x * 180) / (Math.PI * MERCATOR_R),
    };
}

function cubeRound(h: CubeHex): AxialHex {
    let q = Math.round(h.q);
    let r = Math.round(h.r);
    let s = Math.round(h.s);

    const qDiff = Math.abs(q - h.q);
    const rDiff = Math.abs(r - h.r);
    const sDiff = Math.abs(s - h.s);

    if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
    } else if (rDiff > sDiff) {
        r = -q - s;
    } else {
        s = -q - r;
    }

    return { q, r };
}

/** Flat-top axial ↔ Mercator (Red Blob Games convention). */
export function latLonToAxialHex(lat: number, lon: number): AxialHex {
    const p = latLonToMeters(lat, lon);
    const q =
        ((SQRT3 / 3) * p.x - (1 / 3) * p.y) / HUNT_HEX_SIZE;
    const r = ((2 / 3) * p.y) / HUNT_HEX_SIZE;
    return cubeRound({ q, r, s: -q - r });
}

function axialToMercatorMeters(q: number, r: number): Meters {
    return {
        x: HUNT_HEX_SIZE * SQRT3 * (q + r / 2),
        y: HUNT_HEX_SIZE * (3 / 2) * r,
    };
}

export function axialHexToCenter(q: number, r: number): [number, number] {
    const { x, y } = axialToMercatorMeters(q, r);
    const { lat, lon } = metersToLatLon(x, y);
    return [lon, lat];
}

/** Flat-top corners: circumradius = HUNT_HEX_SIZE, angles 60°·i − 30°. */
function flatTopHexVerticesMercator(center: Meters): Meters[] {
    const vertices: Meters[] = [];
    for (let i = 0; i < 6; i += 1) {
        const angleRad = (Math.PI / 180) * (60 * i - 30);
        vertices.push({
            x: center.x + HUNT_HEX_SIZE * Math.cos(angleRad),
            y: center.y + HUNT_HEX_SIZE * Math.sin(angleRad),
        });
    }
    return vertices;
}

export function axialHexToBoundary(q: number, r: number): [number, number][] {
    const center = axialToMercatorMeters(q, r);
    const ring: [number, number][] = flatTopHexVerticesMercator(center).map(
        (vertex) => {
            const { lat, lon } = metersToLatLon(vertex.x, vertex.y);
            return [lon, lat];
        },
    );
    ring.push(ring[0]);
    return ring;
}

export function computeHuntHexForPoi(lat: number, lon: number): HuntHexCell {
    const { q, r } = latLonToAxialHex(lat, lon);
    return {
        gridQ: q,
        gridR: r,
        center: axialHexToCenter(q, r),
        boundary: axialHexToBoundary(q, r),
    };
}

export function huntHexKey(q: number, r: number): string {
    return `${q},${r}`;
}

export type HuntHexGroup<T> = {
    key: string;
    cell: HuntHexCell;
    items: T[];
};

/** Group items that have lat/lon into unique hunt hex cells. */
export function groupByHuntHex<T extends { lat: number; lon: number }>(
    items: T[],
): HuntHexGroup<T>[] {
    const groups = new Map<string, HuntHexGroup<T>>();

    for (const item of items) {
        const cell = computeHuntHexForPoi(item.lat, item.lon);
        const key = huntHexKey(cell.gridQ, cell.gridR);
        const existing = groups.get(key);
        if (existing) {
            existing.items.push(item);
        } else {
            groups.set(key, { key, cell, items: [item] });
        }
    }

    return [...groups.values()];
}

export function huntHexCellsMatch(
    a: Pick<AxialHex, "q" | "r">,
    b: Pick<AxialHex, "q" | "r">,
): boolean {
    return a.q === b.q && a.r === b.r;
}

function boundaryVertices(boundary: [number, number][]): [number, number][] {
    if (boundary.length < 2) {
        return boundary;
    }
    const first = boundary[0];
    const last = boundary[boundary.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
        return boundary.slice(0, -1);
    }
    return boundary;
}

function raySegmentIntersection(
    origin: Meters,
    dir: Meters,
    a: Meters,
    b: Meters,
): number | null {
    const rdx = dir.x;
    const rdy = dir.y;
    const sdx = b.x - a.x;
    const sdy = b.y - a.y;
    const denom = rdx * sdy - rdy * sdx;
    if (Math.abs(denom) < 1e-12) {
        return null;
    }
    const ox = a.x - origin.x;
    const oy = a.y - origin.y;
    const t = (ox * sdy - oy * sdx) / denom;
    const u = (ox * rdy - oy * rdx) / denom;
    if (t > 1e-9 && u >= 0 && u <= 1) {
        return t;
    }
    return null;
}

function hexEdgePointToward(
    hexCenter: [number, number],
    towardLonLat: [number, number],
    boundary: [number, number][],
): [number, number] {
    const centerM = latLonToMeters(hexCenter[1], hexCenter[0]);
    const towardM = latLonToMeters(towardLonLat[1], towardLonLat[0]);
    const dx = towardM.x - centerM.x;
    const dy = towardM.y - centerM.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) {
        return hexCenter;
    }
    const dir = { x: dx / len, y: dy / len };

    const vertices = boundaryVertices(boundary).map(([lon, lat]) =>
        latLonToMeters(lat, lon),
    );

    let minT = Number.POSITIVE_INFINITY;
    for (let i = 0; i < vertices.length; i += 1) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        const t = raySegmentIntersection(centerM, dir, a, b);
        if (t != null && t < minT) {
            minT = t;
        }
    }

    if (!Number.isFinite(minT)) {
        return hexCenter;
    }

    const edge = metersToLatLon(
        centerM.x + dir.x * minT,
        centerM.y + dir.y * minT,
    );
    return [edge.lon, edge.lat];
}

function distanceCenterToHexEdgeAlongRay(
    hexCenter: [number, number],
    towardLonLat: [number, number],
    boundary: [number, number][],
): number {
    const edge = hexEdgePointToward(hexCenter, towardLonLat, boundary);
    return calculateDistance(hexCenter, edge, 0);
}

/**
 * Distance from player to hunt hex boundary along the player→center line.
 * Negative when the player is inside the hex (mirrors circle hunt math).
 */
export function distanceToHuntHexEdge(
    player: [number, number],
    hexCenter: [number, number],
    boundary: [number, number][],
): number {
    const distToCenter = calculateDistance(player, hexCenter, 0);
    const centerToEdge = distanceCenterToHexEdgeAlongRay(
        hexCenter,
        player,
        boundary,
    );
    return distToCenter - centerToEdge;
}

/** Point on the hex boundary along the line from hex center toward the player. */
export function pointOnHuntHexEdge(
    player: [number, number],
    hexCenter: [number, number],
    boundary: [number, number][],
): [number, number] {
    const distToCenter = calculateDistance(player, hexCenter, 0);
    const centerToEdge = distanceCenterToHexEdgeAlongRay(
        hexCenter,
        player,
        boundary,
    );

    if (distToCenter < centerToEdge) {
        return player;
    }

    return hexEdgePointToward(hexCenter, player, boundary);
}
