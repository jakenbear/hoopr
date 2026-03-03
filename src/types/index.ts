export interface GeoPosition {
  lat: number;
  lng: number;
}

export type ShotResult = "hit" | "miss";

export type CourtZone =
  | "paint"
  | "left_block"
  | "right_block"
  | "left_elbow"
  | "right_elbow"
  | "free_throw"
  | "left_wing_mid"
  | "right_wing_mid"
  | "top_key_mid"
  | "left_corner_3"
  | "right_corner_3"
  | "left_wing_3"
  | "right_wing_3"
  | "top_key_3";

export interface Shot {
  id: string;
  zone: CourtZone;
  result: ShotResult;
  position: GeoPosition;
  timestamp: number;
}

export interface Session {
  id: string;
  hoopPosition: GeoPosition;
  hoopBearing: number; // degrees, direction the hoop faces (backboard → court)
  shots: Shot[];
  startTime: number;
  endTime?: number;
}

export interface ZoneStats {
  zone: CourtZone;
  makes: number;
  attempts: number;
  percentage: number;
}
