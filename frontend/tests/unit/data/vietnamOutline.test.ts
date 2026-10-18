import { describe, expect, it } from 'vitest';
import {
  projectVietnamLocation,
  VIETNAM_ISLAND_GROUPS,
  VIETNAM_MAP_VIEWBOX,
} from '@/data/vietnamOutline';

describe('Vietnam geographic canvas', () => {
  it('does not include neighboring Balabac land in the Spratly group', () => {
    const group = VIETNAM_ISLAND_GROUPS.find((item) => item.name === 'Trường Sa');
    if (!group) throw new Error('Missing Spratly group');
    const point = projectVietnamLocation(117.020833, 7.95);
    const [, , width, height] = VIETNAM_MAP_VIEWBOX.split(' ').map(Number);
    const px = (point.x / 100) * width,
      py = (point.y / 100) * height;
    for (const path of group.landPaths) {
      const vertices = [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((match) => [
        Number(match[1]),
        Number(match[2]),
      ]);
      let contains = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const [x, y] = vertices[i],
          [previousX, previousY] = vertices[j];
        if (y > py !== previousY > py && px < ((previousX - x) * (py - y)) / (previousY - y) + x)
          contains = !contains;
      }
      expect(contains).toBe(false);
    }
  });
  it('projects mainland and offshore coordinates into the same regional extent', () => {
    expect(projectVietnamLocation(101.5, 24)).toEqual({ x: 0, y: 0 });
    expect(projectVietnamLocation(118, 6)).toEqual({ x: 100, y: 100 });
    const paracels = projectVietnamLocation(112.225, 16.4666667);
    expect(paracels.x).toBeCloseTo(65, 5);
    expect(paracels.y).toBeCloseTo(42.9205517, 5);
    const conSon = projectVietnamLocation(106.6, 8.7);
    expect(conSon.x).toBeCloseTo(30.9090909, 5);
    expect(conSon.y).toBeCloseTo(85.4585941, 5);
  });

  it('keeps sourced island paths at their true offshore coordinates instead of insets', () => {
    const [, , width, height] = VIETNAM_MAP_VIEWBOX.split(' ').map(Number);
    const limits = [
      { name: 'Hoàng Sa', west: 111.1, east: 112.9, south: 15.7, north: 17.1 },
      { name: 'Trường Sa', west: 113.2, east: 117.6, south: 6.5, north: 11.2 },
      { name: 'Côn Đảo', west: 106.5, east: 106.8, south: 8.6, north: 8.9 },
    ];
    for (const limit of limits) {
      const group = VIETNAM_ISLAND_GROUPS.find((item) => item.name === limit.name);
      if (!group) throw new Error(`Missing ${limit.name}`);
      for (const path of group.landPaths) {
        const points = [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)];
        expect(points.length).toBeGreaterThan(2);
        for (const point of points) {
          const longitude = 101.5 + (Number(point[1]) / width) * 16.5;
          const north = 0.431693764;
          const south = 0.104911679;
          const latitude =
            ((2 * Math.atan(Math.exp(north - (Number(point[2]) / height) * (north - south))) -
              Math.PI / 2) *
              180) /
            Math.PI;
          expect(longitude).toBeGreaterThanOrEqual(limit.west);
          expect(longitude).toBeLessThanOrEqual(limit.east);
          expect(latitude).toBeGreaterThanOrEqual(limit.south);
          expect(latitude).toBeLessThanOrEqual(limit.north);
        }
      }
    }
  });
});
