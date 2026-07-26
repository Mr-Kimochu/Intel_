// Polygon drawing limits — area is used rather than a bounding
// distance since drawn shapes are irregular, not circles.
export const MIN_POLYGON_AREA_KM2 = 0.01;   // ~100m x 100m
export const MAX_POLYGON_AREA_KM2 = 12.5;   // ~ comparable to a 2km-radius circle

// User-facing messages, kept alongside the limits so they stay in sync
export const POLYGON_TOO_SMALL_MSG =
  `Selected area is too small. Draw an area of at least ${MIN_POLYGON_AREA_KM2} km².`;
export const POLYGON_TOO_LARGE_MSG =
  `Selected area is too large. Please draw an area under ${MAX_POLYGON_AREA_KM2} km².`;