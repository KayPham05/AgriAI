'use client';
import { rankCatalog } from '@/lib/catalogText';
import { useEffect, useId, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SearchableCatalogSelect({
  options: items,
  value,
  onChange,
  disabled,
  label,
  searchLabel,
  placeholder,
  emptyMessage,
  selectedLabel,
}: {
  options: { id: string; label: string; searchText?: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  searchLabel: string;
  placeholder: string;
  emptyMessage: string;
  selectedLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLDivElement>(null);
  const selected = items.find((item) => item.id === value);
  const options = rankCatalog(items, search, (item) => item.searchText ?? item.label);
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
      <Label htmlFor={id}>{label}</Label>
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
            aria-label={label}
            disabled={disabled}
            className="h-auto min-h-11 w-full justify-between whitespace-normal text-left"
          >
            <span className="min-w-0 break-words">
              {selected?.label ?? selectedLabel ?? placeholder}
            </span>
            <ChevronDown data-icon="inline-end" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          aria-label={label}
          className="flex w-(--radix-popover-trigger-width) max-h-(--radix-popover-content-available-height) flex-col gap-2 overflow-hidden"
        >
          <Input
            role="combobox"
            aria-label={searchLabel}
            placeholder={searchLabel}
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
            aria-label={label}
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
                <span className="min-w-0 break-words">{pair.label}</span>
                {pair.id === value && <Check data-icon="inline-end" aria-hidden="true" />}
              </Button>
            ))}
          </div>
          {options.length === 0 && (
            <p role="status" className="p-3 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
