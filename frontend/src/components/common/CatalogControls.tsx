import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SearchField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div className="min-w-0 flex-1 space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden="true" />
      <Input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} className="pl-10 pr-12" placeholder={label} />
      {value && <Button variant="ghost" size="icon" className="absolute right-0 top-0" aria-label="Xóa từ khóa" onClick={() => onChange('')}><X /></Button>}
    </div>
  </div>;
}

export function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-11 w-full sm:min-w-44"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
    </Select>
  </div>;
}

export function EmptyResults({ title, onReset }: { title: string; onReset: () => void }) {
  return <div className="rounded-card border border-dashed border-border px-6 py-12 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mt-2 text-sm text-muted-foreground">Thử từ khóa khác hoặc bỏ bộ lọc để xem lại danh sách.</p>
    <Button variant="outline" className="mt-5" onClick={onReset}>Đặt lại bộ lọc</Button>
  </div>;
}
