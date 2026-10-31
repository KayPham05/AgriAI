'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlantDiseasePair } from '@/services/knowledgeApi';

function searchableText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/_/g, ' ')
    .toLowerCase();
}

export function PlantDiseasePicker({
  pairs,
  value,
  onChange,
  disabled,
}: {
  pairs: PlantDiseasePair[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLDivElement>(null);
  const selected = pairs.find((pair) => pair.id === value);
  const terms = searchableText(search).trim().split(/\s+/).filter(Boolean);
  const options = pairs.filter(
    (pair) =>
      (pair.isActive || pair.id === value) &&
      terms.every((term) =>
        searchableText(`${pair.plantName} ${pair.diseaseName} ${pair.className}`).includes(term),
      ),
  );
  const activeIndex = active < options.length ? active : -1;
  useEffect(() => {
    if (activeIndex >= 0)
      list.current?.children[activeIndex]?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex]);
  function choose(id: string) {
    if (disabled) return;
    if (id !== value) onChange(id);
    setOpen(false);
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>Chọn cặp cây và bệnh</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setSearch('');
          setActive(-1);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label="Chọn cặp cây và bệnh"
            disabled={disabled}
            className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
          >
            <span className="min-w-0 break-words">
              {selected
                ? `${selected.plantName} / ${selected.diseaseName}`
                : 'Chọn cặp cây và bệnh'}
            </span>
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          aria-label="Chọn cặp cây và bệnh"
          className="flex w-(--radix-popover-trigger-width) max-h-(--radix-popover-content-available-height) flex-col gap-2 overflow-hidden"
        >
          <Input
            role="combobox"
            aria-label="Tìm cặp cây và bệnh"
            placeholder="Tìm cây hoặc bệnh..."
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${id}-options`}
            aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
            value={search}
            disabled={disabled}
            onChange={(event) => {
              setSearch(event.target.value);
              setActive(-1);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (options.length)
                  setActive(
                    event.key === 'ArrowDown'
                      ? (activeIndex + 1) % options.length
                      : activeIndex <= 0
                        ? options.length - 1
                        : activeIndex - 1,
                  );
              } else if (event.key === 'Enter') {
                event.preventDefault();
                if (activeIndex >= 0) choose(options[activeIndex].id);
              }
            }}
          />
          <div
            ref={list}
            id={`${id}-options`}
            role="listbox"
            aria-label="Cặp cây và bệnh"
            className="min-h-0 max-h-64 overflow-y-auto"
          >
            {options.map((pair, index) => (
              <Button
                key={pair.id}
                id={`${id}-option-${index}`}
                type="button"
                variant="ghost"
                role="option"
                aria-selected={pair.id === value}
                disabled={disabled}
                className={`h-auto min-h-11 w-full justify-between whitespace-normal text-left ${index === activeIndex ? 'bg-accent' : ''}`}
                onClick={() => choose(pair.id)}
              >
                <span className="min-w-0 break-words">
                  {pair.plantName} / {pair.diseaseName}
                  {!pair.isActive && ' (ngừng hoạt động)'}
                </span>
                {pair.id === value && <Check data-icon="inline-end" aria-hidden="true" />}
              </Button>
            ))}
          </div>
          {options.length === 0 && (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              Không tìm thấy cặp cây và bệnh phù hợp.
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
