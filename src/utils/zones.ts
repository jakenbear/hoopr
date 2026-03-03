import type { CourtZone, GeoPosition } from "../types";

/**
 * Given the hoop position, a bearing (direction the court extends from the hoop),
 * and the shooter's current GPS position, classify which court zone they're in.
 *
 * We convert the shooter's position to a local coordinate system:
 *   - x: lateral distance (negative = left, positive = right when facing the hoop)
 *   - y: distance from the hoop straight out toward the court
 *
 * Then use distance + angle thresholds to classify the zone.
 */

const THREE_POINT_DISTANCE = 7.24; // meters (NBA 3-point line)
const PAINT_WIDTH = 4.88; // meters (NBA lane width)
const PAINT_DEPTH = 5.79; // meters (NBA paint depth from baseline)
const FREE_THROW_DISTANCE = 4.57; // meters from hoop
const CORNER_THREE_DEPTH = 4.27; // meters — corner 3 is closer along baseline

// Haversine distance between two GPS points in meters
export function gpsDistance(a: GeoPosition, b: GeoPosition): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aVal =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

// Bearing from point a to point b in degrees (0 = north, 90 = east)
export function gpsBearing(a: GeoPosition, b: GeoPosition): number {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Convert shooter GPS to local court coordinates (x, y) in meters,
 * relative to hoop position and court bearing.
 */
export function toCourtCoords(
  hoop: GeoPosition,
  courtBearing: number,
  shooter: GeoPosition
): { x: number; y: number } {
  const dist = gpsDistance(hoop, shooter);
  const bearing = gpsBearing(hoop, shooter);

  // Angle relative to court direction
  const relAngle = ((bearing - courtBearing + 360) % 360) * (Math.PI / 180);

  return {
    x: dist * Math.sin(relAngle), // lateral (+ right, - left)
    y: dist * Math.cos(relAngle), // distance from hoop into court
  };
}

export function classifyZone(
  hoop: GeoPosition,
  courtBearing: number,
  shooter: GeoPosition
): CourtZone {
  const { x, y } = toCourtCoords(hoop, courtBearing, shooter);
  const dist = Math.sqrt(x * x + y * y);
  const absX = Math.abs(x);
  const isLeft = x < 0;

  // In the paint
  if (dist <= FREE_THROW_DISTANCE && absX <= PAINT_WIDTH / 2) {
    if (dist <= 1.5) return "paint"; // very close to hoop
    if (absX <= 1.0) return "free_throw";
    return isLeft ? "left_block" : "right_block";
  }

  // Close to hoop but outside paint width — elbows
  if (dist <= PAINT_DEPTH && absX > PAINT_WIDTH / 2 && absX <= PAINT_WIDTH) {
    return isLeft ? "left_elbow" : "right_elbow";
  }

  // Corner 3 — close to baseline (low y) and wide
  if (y <= CORNER_THREE_DEPTH && absX > PAINT_WIDTH / 2) {
    return isLeft ? "left_corner_3" : "right_corner_3";
  }

  // Beyond 3-point line
  if (dist >= THREE_POINT_DISTANCE) {
    const angle = Math.atan2(absX, y) * (180 / Math.PI);
    if (angle < 25) return "top_key_3";
    return isLeft ? "left_wing_3" : "right_wing_3";
  }

  // Mid-range
  const angle = Math.atan2(absX, y) * (180 / Math.PI);
  if (angle < 25) return "top_key_mid";
  return isLeft ? "left_wing_mid" : "right_wing_mid";
}

// Zone display names
export const ZONE_LABELS: Record<CourtZone, string> = {
  paint: "Paint",
  left_block: "Left Block",
  right_block: "Right Block",
  left_elbow: "Left Elbow",
  right_elbow: "Right Elbow",
  free_throw: "Free Throw",
  left_wing_mid: "Left Wing Mid",
  right_wing_mid: "Right Wing Mid",
  top_key_mid: "Top of Key Mid",
  left_corner_3: "Left Corner 3",
  right_corner_3: "Right Corner 3",
  left_wing_3: "Left Wing 3",
  right_wing_3: "Right Wing 3",
  top_key_3: "Top of Key 3",
};

// Court positions for rendering zones on the SVG (x, y as percentages of court width/height)
export const ZONE_POSITIONS: Record<CourtZone, { x: number; y: number }> = {
  paint:          { x: 50, y: 85 },
  left_block:     { x: 35, y: 88 },
  right_block:    { x: 65, y: 88 },
  left_elbow:     { x: 32, y: 75 },
  right_elbow:    { x: 68, y: 75 },
  free_throw:     { x: 50, y: 73 },
  left_wing_mid:  { x: 20, y: 62 },
  right_wing_mid: { x: 80, y: 62 },
  top_key_mid:    { x: 50, y: 58 },
  left_corner_3:  { x: 8,  y: 88 },
  right_corner_3: { x: 92, y: 88 },
  left_wing_3:    { x: 12, y: 52 },
  right_wing_3:   { x: 88, y: 52 },
  top_key_3:      { x: 50, y: 42 },
};
