import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SearchField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setDraft(value);
    clearTimeout(timer.current);
    return () => clearTimeout(timer.current);
  }, [value]);

  function changeSearch(nextValue: string) {
    setDraft(nextValue);
    clearTimeout(timer.current);
    if (!nextValue) onChange('');
    else timer.current = setTimeout(() => onChange(nextValue), 500);
  }

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id={id}
          type="search"
          value={draft}
          onChange={(e) => changeSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
            e.preventDefault();
            clearTimeout(timer.current);
            onChange(draft);
          }}
          className="pl-10 pr-12"
          placeholder={label}
        />
        {draft && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0"
            aria-label="Xóa từ khóa"
            onClick={() => changeSearch('')}
          >
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}

export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-11 w-full sm:min-w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="start"
          side="bottom"
          style={{
            maxHeight:
              'min(calc(var(--spacing) * 64), var(--radix-select-content-available-height))',
          }}
        >
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

export function EmptyResults({ title, onReset }: { title: string; onReset: () => void }) {
  return (
    <div className="rounded-card border border-dashed border-border px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Thử từ khóa khác hoặc bỏ bộ lọc để xem lại danh sách.
      </p>
      <Button variant="outline" className="mt-5" onClick={onReset}>
        Đặt lại bộ lọc
      </Button>
    </div>
  );
}
