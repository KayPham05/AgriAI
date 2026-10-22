'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardAction,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SelectionFeedback } from '@/components/common/SelectionFeedback';
import { CropMapCanvas } from '@/components/common/CropMapCanvas';
import { CROP_REGIONS, type CropRegion } from '@/data/cropRegions';
import type { Plant } from '@/types';

gsap.registerPlugin(useGSAP);

interface CropMapProps {
  plants: Plant[];
  onSelectPlant?: (plant: Plant) => void;
  children?: ReactNode;
}

function CropMapHeroLayout({
  children,
  info,
  map,
  open,
  name,
  onClose,
  triggerRef,
}: {
  children: ReactNode;
  info: ReactNode;
  map: ReactNode;
  open: boolean;
  name: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const scale = parseFloat(tokens.getPropertyValue('--crop-map-copy-recede-scale'));
      const panelScale = parseFloat(tokens.getPropertyValue('--crop-map-dialog-enter-scale'));
      if (![duration, distance, scale, panelScale].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add(
        {
          normal: '(prefers-reduced-motion: no-preference)',
          reduced: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const timeline = gsap.timeline({
            paused: true,
            defaults: {
              duration: context.conditions?.reduced ? 0 : duration,
              ease: 'power3.inOut',
            },
          });
          timeline
            .fromTo(
              root.querySelector('[data-map-hero-copy]'),
              { autoAlpha: 1, scale: 1, x: 0 },
              { autoAlpha: 0, scale, x: -distance },
              0,
            )
            .fromTo(
              root.querySelector('[data-map-hero-panel]'),
              { autoAlpha: 0, scaleX: panelScale, x: distance, transformOrigin: 'right center' },
              { autoAlpha: 1, scaleX: 1, x: 0 },
              0,
            );
          timelineRef.current = timeline;
          timeline.progress(openRef.current ? 1 : 0);
          return () => {
            timelineRef.current = null;
          };
        },
      );
      return () => media.revert();
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      if (open) timelineRef.current?.play();
      else timelineRef.current?.reverse();
    },
    { scope: rootRef, dependencies: [open] },
  );

  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }
    // GSAP reveals the panel on its next frame; hidden controls cannot receive focus.
    const focusFrame = requestAnimationFrame(() => {
      closeRef.current?.focus({ preventScroll: true });
    });
    const handleEscape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        !document.querySelector('[role="dialog"]')
      )
        onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose, triggerRef]);

  return (
    <div
      ref={rootRef}
      data-map-exploring={open}
      className="crop-map-hero-layout group/map-explore mx-auto grid max-w-7xl grid-cols-2 items-start gap-3 px-4 pt-6 pb-10 sm:gap-6 sm:px-8 sm:pt-8 lg:gap-12 lg:px-12 lg:pb-16"
    >
      <div className="relative grid min-w-0 max-w-xl md:pt-4 lg:pt-12 md:group-data-[map-exploring=true]/map-explore:pt-0">
        <div
          data-map-hero-copy
          aria-hidden={open}
          inert={open}
          className="col-start-1 row-start-1 min-w-0 self-start group-data-[map-exploring=true]/map-explore:absolute group-data-[map-exploring=true]/map-explore:inset-x-0 group-data-[map-exploring=true]/map-explore:top-0"
        >
          {children}
        </div>
        <section
          data-map-hero-panel
          aria-label={name}
          aria-hidden={!open}
          inert={!open}
          className="absolute inset-x-0 top-0 col-start-1 row-start-1 min-w-0 self-start group-data-[map-exploring=true]/map-explore:relative"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h2 className="text-xl font-semibold text-primary">{name}</h2>
              </CardTitle>
              <CardDescription>Cây trồng tiêu biểu tại địa phương</CardDescription>
              <CardAction>
                <Button
                  ref={closeRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Đóng thông tin địa điểm"
                  onClick={onClose}
                >
                  <X aria-hidden="true" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>{info}</CardContent>
          </Card>
        </section>
      </div>
      <div className="min-w-0">{map}</div>
    </div>
  );
}

function CropMapDialogMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const root = rootRef.current;
      const dialog = root?.closest('[data-slot="dialog-content"]');
      if (!root || !dialog || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const opacity = parseFloat(tokens.getPropertyValue('--selection-enter-opacity'));
      const scale = parseFloat(tokens.getPropertyValue('--crop-map-dialog-enter-scale'));
      if (![duration, distance, opacity, scale].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const timeline = gsap.timeline({ defaults: { duration, ease: 'power3.out' } });
        timeline
          .fromTo(
            dialog,
            { scaleX: scale, transformOrigin: 'right center' },
            { scaleX: 1, clearProps: 'transform,transformOrigin' },
            0,
          )
          .fromTo(
            root.querySelector('[data-crop-map-info]'),
            { x: distance, opacity },
            { x: 0, opacity: 1, clearProps: 'transform,opacity' },
            0,
          )
          .fromTo(
            root.querySelector('[data-crop-map-detail]'),
            { x: distance, opacity },
            { x: 0, opacity: 1, clearProps: 'transform,opacity' },
            0,
          );
      });
      return () => media.revert();
    },
    { scope: rootRef },
  );
  return (
    <div ref={rootRef} className="flex min-h-0 flex-col gap-4">
      {children}
    </div>
  );
}

export function CropMap({ plants, onSelectPlant, children }: CropMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const closeDetails = useCallback(() => setDetailsOpen(false), []);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const plantsById = new Map(plants.map((plant) => [plant.id, plant]));
  const regions = CROP_REGIONS.map((region) => ({
    ...region,
    crops: region.crops.filter((crop) => plantsById.has(crop.plantId)),
  })).filter((region) => region.crops.length > 0);

  useGSAP(
    (_context, contextSafe) => {
      const root = mapRef.current;
      if (!root || !contextSafe || typeof window.matchMedia !== 'function') return;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--view-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--view-enter-duration'));
      const stagger = parseFloat(tokens.getPropertyValue('--selection-enter-stagger'));
      const opacity = parseFloat(tokens.getPropertyValue('--selection-enter-opacity'));
      if (![distance, duration, stagger, opacity].every(Number.isFinite)) return;

      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        let entrance: gsap.core.Timeline | undefined;
        const reveal = contextSafe(() => {
          const pins = Array.from(root.querySelectorAll<HTMLElement>('[data-crop-map-pin]'));
          pins.sort((a, b) => Number(b.dataset.latitude) - Number(a.dataset.latitude));
          entrance = gsap.timeline({ defaults: { duration, ease: 'power3.out' } });
          entrance
            .fromTo(
              root.querySelector('svg'),
              { opacity, y: distance },
              { opacity: 1, y: 0, clearProps: 'opacity,transform' },
            )
            .fromTo(
              pins,
              { opacity, y: distance },
              { opacity: 1, y: 0, stagger, clearProps: 'opacity,transform' },
              '<',
            );
        });

        // Start only when the map is visible, including the stacked mobile hero.
        if (typeof IntersectionObserver !== 'function') {
          reveal();
          return () => entrance?.revert();
        }
        const observer = new IntersectionObserver((entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          reveal();
        });
        observer.observe(root);
        return () => {
          observer.disconnect();
          entrance?.revert();
        };
      });
      return () => media.revert();
    },
    { scope: mapRef },
  );

  useGSAP(
    () => {
      const root = mapRef.current;
      if (!root || !selectedRegionId || typeof window.matchMedia !== 'function') return;
      const pin = root.querySelector('[aria-pressed="true"] [data-crop-map-feedback]');
      if (!pin) return;
      const tokens = getComputedStyle(root);
      const distance = parseFloat(tokens.getPropertyValue('--selection-enter-distance'));
      const duration = parseFloat(tokens.getPropertyValue('--selection-enter-duration'));
      if (![distance, duration].every(Number.isFinite)) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          pin,
          { y: -distance / 2 },
          { y: 0, duration, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' },
        );
      });
      return () => media.revert();
    },
    { scope: mapRef, dependencies: [selectedRegionId], revertOnUpdate: true },
  );

  if (regions.length === 0) return null;

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? regions[0];
  const selectedCrop =
    selectedRegion.crops.find((crop) => crop.plantId === selectedPlantId) ??
    selectedRegion.crops[0];
  const selectedPlant = plantsById.get(selectedCrop.plantId);
  if (!selectedPlant) return null;
  const selectRegion = (region: CropRegion, trigger: HTMLButtonElement) => {
    if (!detailsOpen) triggerRef.current = trigger;
    setSelectedRegionId(region.id);
    setSelectedPlantId(region.crops[0].plantId);
    setDetailsOpen(true);
  };

  const map = (
    <section aria-label="Bản đồ cây trồng Việt Nam" className="min-w-0">
      <figure className="min-w-0">
        <CropMapCanvas
          containerRef={mapRef}
          regions={regions}
          plantsById={plantsById}
          selectedRegionId={selectedRegionId}
          detailsOpen={detailsOpen}
          onRegionSelect={selectRegion}
          inlineDetails={Boolean(children)}
        />
      </figure>
    </section>
  );
  const info = (
    <div data-crop-map-info className="min-w-0">
      <SelectionFeedback
        selectionKey={`${selectedRegion.id}:${selectedPlant.id}`}
        mode="preview"
        className="min-w-0"
      >
        {selectedRegion.crops.length > 1 ? (
          <fieldset className="flex flex-wrap gap-2" aria-label="Cây tại địa điểm">
            {selectedRegion.crops.map((crop) => {
              const plant = plantsById.get(crop.plantId);
              if (!plant) return null;
              return (
                <Button
                  key={crop.plantId}
                  type="button"
                  variant={crop.plantId === selectedCrop.plantId ? 'default' : 'outline'}
                  aria-pressed={crop.plantId === selectedCrop.plantId}
                  onClick={() => setSelectedPlantId(crop.plantId)}
                >
                  {plant.name}
                </Button>
              );
            })}
          </fieldset>
        ) : null}

        <div className="mt-6 grid gap-5">
          <Image
            data-selection-photo
            src={selectedPlant.imageUrl}
            alt={`Ảnh minh họa cây ${selectedPlant.name}`}
            width={480}
            height={480}
            className="aspect-[4/3] w-full rounded-media object-cover"
          />
          <div data-selection-copy className="min-w-0">
            <h4 className="text-xl font-semibold text-foreground">{selectedPlant.name}</h4>
            <p className="mt-1 text-sm italic text-muted-foreground">
              {selectedPlant.scientificName}
            </p>
            <p className="mt-4 text-sm font-semibold text-primary">{selectedCrop.locality}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedCrop.context}</p>
            <a
              href={selectedCrop.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Mở nguồn vùng trồng trong tab mới"
              className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Nguồn vùng trồng <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </div>
        </div>
        {onSelectPlant ? (
          <Button
            className="mt-6"
            onClick={() => {
              setDetailsOpen(false);
              onSelectPlant(selectedPlant);
            }}
          >
            Xem cây trong cẩm nang <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        ) : null}
      </SelectionFeedback>
    </div>
  );

  if (children)
    return (
      <CropMapHeroLayout
        info={info}
        map={map}
        open={detailsOpen}
        name={selectedRegion.name}
        onClose={closeDetails}
        triggerRef={triggerRef}
      >
        {children}
      </CropMapHeroLayout>
    );

  return (
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      {map}
      <DialogContent
        className="flex max-h-(--crop-map-dialog-max-height) flex-col overflow-hidden sm:max-w-(--crop-map-dialog-width) data-open:animate-none data-closed:animate-none"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <CropMapDialogMotion>
          <DialogHeader>
            <DialogTitle className="text-primary">{selectedRegion.name}</DialogTitle>
            <DialogDescription>Cây trồng tiêu biểu tại địa phương</DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-6 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            {info}
            <section
              data-crop-map-detail
              aria-label="Chọn địa điểm trên bản đồ"
              className="min-w-0 py-3 md:sticky md:top-0 md:self-start"
            >
              <CropMapCanvas
                variant="details"
                regions={regions}
                plantsById={plantsById}
                selectedRegionId={selectedRegionId}
                onRegionSelect={selectRegion}
              />
            </section>
          </div>
        </CropMapDialogMotion>
      </DialogContent>
    </Dialog>
  );
}
