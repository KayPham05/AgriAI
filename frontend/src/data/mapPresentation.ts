// User-approved compact illustration, separate from the unmodified geographic data.
// Offshore offsets change displayed distance only, not source coordinates or shapes.
export const CROP_MAP_PRESENTATION_WIDTH = 480;
export const CROP_MAP_ISLAND_OFFSETS: Readonly<Record<string, number>> = {
  'Hoàng Sa': -80,
  'Trường Sa': -128,
  'Côn Đảo': 0,
};
