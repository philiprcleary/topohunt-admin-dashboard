// Utility helpers for map-related calculations

// Haversine formula to calculate distance between two points
export const calculateDistance = (
    coord1: [number, number],
    coord2: [number, number],
    circleRadius: number = 0
): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (coord1[1] * Math.PI) / 180;
    const φ2 = (coord2[1] * Math.PI) / 180;
    const Δφ = ((coord2[1] - coord1[1]) * Math.PI) / 180;
    const Δλ = ((coord2[0] - coord1[0]) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c - circleRadius; // Distance in meters
};

// Calculate point at a fixed distance from center along the line from center to point
export const getPointAtDistance = (
    center: [number, number],
    point: [number, number],
    distanceMeters: number
): [number, number] => {
    const [centerLon, centerLat] = center;
    const [pointLon, pointLat] = point;

    // Calculate the distance from center to point
    const totalDistance = calculateDistance(center, point);

    // If the point is closer than the radius, return the point itself
    if (totalDistance < distanceMeters) {
        return point;
    }

    // Calculate direction vector from center to point
    const dLon = pointLon - centerLon;
    const dLat = pointLat - centerLat;

    // Calculate the ratio to scale the direction vector
    const ratio = distanceMeters / totalDistance;

    // Calculate the point at the specified distance along the line
    const resultLon = centerLon + dLon * ratio;
    const resultLat = centerLat + dLat * ratio;

    return [resultLon, resultLat];
};

// Calculate zoom level based on distance to show both points with padding
// Accounts for map view dimensions and rotation

export const getFitBoundsPointsAroundPlayer = (
    playerLocation: [number, number],
    targetLocation: [number, number],
    extraDistanceParam: number = 0
): {
    ne: [number, number];
    sw: [number, number];
} => {
    const R = 6371e3;

    const distance =
        calculateDistance(playerLocation, targetLocation) +
        extraDistanceParam;

    const playerLatRad = (playerLocation[1] * Math.PI) / 180;
    const playerLonRad = (playerLocation[0] * Math.PI) / 180;

    const targetLatRad = (targetLocation[1] * Math.PI) / 180;

    const dLon =
        ((targetLocation[0] - playerLocation[0]) * Math.PI) / 180;

    const y = Math.sin(dLon) * Math.cos(targetLatRad);

    const x =
        Math.cos(playerLatRad) * Math.sin(targetLatRad) -
        Math.sin(playerLatRad) *
        Math.cos(targetLatRad) *
        Math.cos(dLon);

    const bearing = Math.atan2(y, x);

    const reverseBearing = bearing + Math.PI;

    const angularDistance = distance / R;

    // Point beyond target
    const targetSideLatRad = Math.asin(
        Math.sin(playerLatRad) * Math.cos(angularDistance) +
        Math.cos(playerLatRad) *
        Math.sin(angularDistance) *
        Math.cos(bearing)
    );

    const targetSideLonRad =
        playerLonRad +
        Math.atan2(
            Math.sin(bearing) *
            Math.sin(angularDistance) *
            Math.cos(playerLatRad),
            Math.cos(angularDistance) -
            Math.sin(playerLatRad) *
            Math.sin(targetSideLatRad)
        );

    // Point opposite side
    const oppositeLatRad = Math.asin(
        Math.sin(playerLatRad) * Math.cos(angularDistance) +
        Math.cos(playerLatRad) *
        Math.sin(angularDistance) *
        Math.cos(reverseBearing)
    );

    const oppositeLonRad =
        playerLonRad +
        Math.atan2(
            Math.sin(reverseBearing) *
            Math.sin(angularDistance) *
            Math.cos(playerLatRad),
            Math.cos(angularDistance) -
            Math.sin(playerLatRad) *
            Math.sin(oppositeLatRad)
        );

    return {
        ne: [
            ((targetSideLonRad * 180) / Math.PI + 540) % 360 - 180,
            (targetSideLatRad * 180) / Math.PI,
        ],
        sw: [
            ((oppositeLonRad * 180) / Math.PI + 540) % 360 - 180,
            (oppositeLatRad * 180) / Math.PI,
        ],
    };
};

export const calculateDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
