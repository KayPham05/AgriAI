import { CORE_PLANT_IDS, SUPPORTED_PLANTS } from './plantData';
import { CROP_PHOTOS } from './cropPhotos';

const orderedPlants = [
  ...CORE_PLANT_IDS.flatMap((id) => SUPPORTED_PLANTS.filter((plant) => plant.id === id)),
  ...SUPPORTED_PLANTS.filter((plant) => !CORE_PLANT_IDS.includes(plant.id)),
];

export const BOTANICAL_BANNERS = orderedPlants.map((plant) => ({
  id: plant.id,
  name: plant.name,
  ...CROP_PHOTOS[plant.id],
}));
