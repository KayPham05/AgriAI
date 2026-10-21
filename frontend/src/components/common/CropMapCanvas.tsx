'use client';

import { Fragment, type RefObject, useId, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CropRegion } from '@/data/cropRegions';
import { CROP_MAP_PRESENTATION_WIDTH, CROP_MAP_ISLAND_OFFSETS } from '@/data/mapPresentation';
import {
  projectVietnamLocation,
  VIETNAM_ISLAND_GROUPS,
  VIETNAM_MAP_WIDTH,
  VIETNAM_MAP_HEIGHT,
  VIETNAM_OUTLINE_PATH,
} from '@/data/vietnamOutline';
import type { Plant } from '@/types';

gsap.registerPlugin(useGSAP);

interface CropMapCanvasProps {
  regions: CropRegion[];
  plantsById: Map<string, Plant>;
  selectedRegionId: string | null;
  onRegionSelect: (region: CropRegion, trigger: HTMLButtonElement) => void;
  variant?: 'hero' | 'details';
  containerRef?: RefObject<HTMLDivElement | null>;
  detailsOpen?: boolean;
  inlineDetails?: boolean;
}

export function CropMapCanvas({
  regions,
  plantsById,
  selectedRegionId,
  onRegionSelect,
  variant = 'hero',
  containerRef,
  detailsOpen = false,
  inlineDetails = false,
}: CropMapCanvasProps) {
  const ownRef = useRef<HTMLDivElement>(null);
  const rootRef = containerRef ?? ownRef;
  const canopyId = `crop-map-${useId().replace(/:/g, '')}`;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || !selectedRegionId || typeof window.matchMedia !== 'function') return;
      const selectedPin = root.querySelector('[aria-pressed="true"] [data-crop-map-active]');
      const tokens = getComputedStyle(root);
      const scale = parseFloat(tokens.getPropertyValue('--crop-map-selected-scale'));
      const duration = parseFloat(tokens.getPropertyValue('--selection-enter-duration'));
      if (!selectedPin || ![scale, duration].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          selectedPin,
          { scale: 1 },
          { scale, duration, ease: 'power3.out', clearProps: 'transform' },
        );
      });
      return () => media.revert();
    },
    { scope: rootRef, dependencies: [selectedRegionId], revertOnUpdate: true },
  );

  return (
    <section
      className={cn(
        'mx-auto max-w-full overflow-x-auto overflow-y-hidden focus-visible:outline-2 focus-visible:outline-ring',
        variant === 'details'
          ? 'max-w-(--crop-map-detail-width)'
          : 'crop-map-hero-canvas w-full max-w-lg',
      )}
      tabIndex={variant === 'details' ? 0 : undefined}
      aria-label={
        variant === 'hero'
          ? 'Bản đồ địa lý Việt Nam'
          : 'Bản đồ địa lý Việt Nam, cuộn ngang để xem các đảo phía đông'
      }
    >
      <div
        ref={rootRef}
        className={cn('relative mx-auto', variant === 'hero' ? 'w-full' : 'w-108')}
        style={{
          aspectRatio: `${CROP_MAP_PRESENTATION_WIDTH} / ${VIETNAM_MAP_HEIGHT}`,
          maxWidth:
            variant === 'hero'
              ? `calc(var(--crop-map-hero-max-height) * ${CROP_MAP_PRESENTATION_WIDTH / VIETNAM_MAP_HEIGHT})`
              : undefined,
        }}
      >
        <svg
          viewBox={`0 0 ${CROP_MAP_PRESENTATION_WIDTH} ${VIETNAM_MAP_HEIGHT}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <pattern
              id={canopyId}
              patternUnits="userSpaceOnUse"
              width={VIETNAM_MAP_WIDTH}
              height={VIETNAM_MAP_HEIGHT}
            >
              <image
                href="/images/vietnam-canopy-texture.webp"
                width={VIETNAM_MAP_WIDTH}
                height={VIETNAM_MAP_HEIGHT}
                preserveAspectRatio="xMidYMid slice"
              />
            </pattern>
          </defs>
          <path
            d={VIETNAM_OUTLINE_PATH}
            className="crop-map-outline"
            fill={`url(#${canopyId})`}
            fillRule="evenodd"
          />
          {VIETNAM_ISLAND_GROUPS.map((group) => (
            <g
              key={group.name}
              transform={`translate(${CROP_MAP_ISLAND_OFFSETS[group.name] ?? 0} 0)`}
            >
              {group.reefPaths.map((path) => (
                <path key={path} d={path} className="crop-map-reef" />
              ))}
              {group.landPaths.map((path) => (
                <path key={path} d={path} className="crop-map-island" fill={`url(#${canopyId})`} />
              ))}
            </g>
          ))}
        </svg>
        {VIETNAM_ISLAND_GROUPS.map((group) => (
          <span
            key={group.name}
            className={cn(
              'absolute -translate-x-1/2 whitespace-nowrap bg-transparent px-1 text-center text-xs font-semibold leading-tight text-primary',
            )}
            style={{
              left: `${((group.label.x + (CROP_MAP_ISLAND_OFFSETS[group.name] ?? 0)) / CROP_MAP_PRESENTATION_WIDTH) * 100}%`,
              top: `${(group.label.y / VIETNAM_MAP_HEIGHT) * 100}%`,
            }}
          >
            {group.name}
          </span>
        ))}
        {regions.map((region) => {
          const leadPlant = plantsById.get(region.crops[0].plantId);
          if (!leadPlant) return null;
          const geographicLocation = projectVietnamLocation(region.longitude, region.latitude);
          const location = {
            x: (geographicLocation.x * VIETNAM_MAP_WIDTH) / CROP_MAP_PRESENTATION_WIDTH,
            y: geographicLocation.y,
          };
          const isSelected = selectedRegionId === region.id;
          return (
            <Fragment key={region.id}>
              {region.markerOffset && (
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 1 2"
                  preserveAspectRatio="none"
                  className="crop-map-pin-leader pointer-events-none absolute overflow-visible text-primary"
                  style={{
                    left: `${location.x}%`,
                    top: `calc(${location.y}% - var(--crop-map-nearby-pin-rise))`,
                  }}
                >
                  <line
                    x1="0"
                    y1="2"
                    x2="1"
                    y2={region.markerOffset === 'north-east' ? '0' : '2'}
                    stroke="currentColor"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Xem ${leadPlant.name} tại ${region.name}`}
                aria-pressed={isSelected}
                aria-haspopup={variant === 'hero' && !inlineDetails ? 'dialog' : undefined}
                aria-expanded={variant === 'hero' ? detailsOpen && isSelected : undefined}
                onClick={(event) => onRegionSelect(region, event.currentTarget)}
                className="absolute -translate-x-1/2 -translate-y-full rounded-lg p-0 text-primary hover:bg-transparent aria-expanded:bg-transparent aria-expanded:text-primary aria-pressed:z-10"
                style={{
                  left: region.markerOffset
                    ? `calc(${location.x}% + var(--crop-map-nearby-pin-offset))`
                    : `${location.x}%`,
                  top:
                    region.markerOffset === 'north-east'
                      ? `calc(${location.y}% - var(--crop-map-nearby-pin-rise))`
                      : `${location.y}%`,
                }}
              >
                <span
                  data-crop-map-pin
                  data-latitude={region.latitude}
                  className="pointer-events-none relative block size-full"
                >
                  <span data-crop-map-feedback className="relative block size-full">
                    <span
                      data-crop-map-active
                      className="crop-map-pin-artwork relative block size-full"
                    >
                      <MapPin
                        aria-hidden="true"
                        className={cn('size-full fill-surface', isSelected && 'fill-secondary')}
                      />
                      <Image
                        src={leadPlant.imageUrl}
                        alt=""
                        width={24}
                        height={24}
                        className="pointer-events-none absolute left-1/2 top-1.5 size-6 -translate-x-1/2 rounded-full object-cover"
                      />
                      {region.crops.length > 1 ? (
                        <Badge variant="secondary" className="absolute -right-1 -top-1 px-1.5">
                          +{region.crops.length - 1}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </span>
              </Button>
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
