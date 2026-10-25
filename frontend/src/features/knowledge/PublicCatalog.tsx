'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  catalogRequest,
  loadAllPairs,
  readCatalogPage,
  recordName,
  type CatalogFilter,
  type CatalogKind,
  type CatalogPage,
  type CatalogRecord,
  type PlantDiseasePair,
} from '@/services/knowledgeApi';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/common/CatalogControls';
import { CatalogPager, CatalogSelect } from './CatalogControls';
import { catalogError, catalogLabels, contentFields, publicPath, safeSource } from './catalogUi';

export function CatalogLinks() {
  return (
    <nav aria-label="Tra cứu nông nghiệp" className="flex flex-wrap gap-2">
      {(Object.keys(catalogLabels) as CatalogKind[]).map((kind) => (
        <Button key={kind} asChild variant="outline">
          <Link href={publicPath(kind)}>{catalogLabels[kind]}</Link>
        </Button>
      ))}
    </nav>
  );
}

function CatalogContent({
  kind,
  record,
  pairs,
}: {
  kind: CatalogKind;
  record: CatalogRecord;
  pairs: PlantDiseasePair[];
}) {
  const source = safeSource(record.sourceUrl);
  const linkedPairs = pairs.filter((pair) =>
    kind === 'plants'
      ? pair.plantId === record.id
      : kind === 'diseases'
        ? pair.diseaseId === record.id
        : record.plantDiseaseIds?.includes(pair.id),
  );
  return (
    <article className="flex min-w-0 flex-col gap-6">
      <Button asChild variant="outline" className="self-start">
        <Link href={publicPath(kind)}>Về danh sách</Link>
      </Button>
      <header className="flex flex-col gap-2">
        <h1 className="break-words text-3xl font-bold text-foreground">{recordName(record)}</h1>
        {record.updatedAt && (
          <p className="text-sm text-muted-foreground">
            Cập nhật:{' '}
            <time dateTime={record.updatedAt}>
              {new Date(record.updatedAt).toLocaleDateString('vi-VN')}
            </time>
          </p>
        )}
      </header>
      {kind === 'medicines' && (
        <p className="rounded-card border border-border bg-surface-muted p-4">
          Thông tin tra cứu không thay thế việc đối chiếu cây, bệnh và hướng dẫn trên nhãn. Chỉ sử
          dụng cho đúng đối tượng đã được xác minh.
        </p>
      )}
      <dl className="flex max-w-prose flex-col gap-6">
        {contentFields[kind]
          .filter(
            (field) =>
              !['title', 'productName', 'name', 'vietnameseName', 'sourceUrl'].includes(field.key),
          )
          .map((field) =>
            record[field.key] ? (
              <div key={field.key}>
                <dt className="mb-2 font-semibold">{field.label}</dt>
                <dd className="whitespace-pre-wrap break-words leading-relaxed">
                  {String(record[field.key])}
                </dd>
              </div>
            ) : null,
          )}
      </dl>
      {source && (
        <Link
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start break-all font-semibold text-primary underline underline-offset-4"
        >
          Xem nguồn tham khảo
        </Link>
      )}
      {kind === 'medicines' && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">Hướng dẫn theo đối tượng sử dụng</h2>
          {record.uses
            ?.filter((use) => use.isApproved && use.isLabelVerified)
            .map((use) => {
              const pair = pairs.find((item) => item.id === use.plantDiseaseId);
              return (
                <div key={use.plantDiseaseId} className="border-t border-border pt-4">
                  <h3 className="font-semibold">
                    {pair
                      ? `${pair.plantName} / ${pair.diseaseName}`
                      : 'Đối tượng đang được cập nhật'}
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap break-words">{use.labelDirections}</p>
                </div>
              );
            })}
          {!record.uses?.some((use) => use.isApproved && use.isLabelVerified) && (
            <p>Chưa có hướng dẫn sử dụng đã xác minh được công khai.</p>
          )}
        </section>
      )}
      {linkedPairs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Tra cứu liên quan</h2>
          <ul className="flex flex-col gap-4">
            {linkedPairs.map((pair) => (
              <li key={pair.id} className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">
                  {pair.plantName} / {pair.diseaseName}
                </span>
                <Link
                  className="text-primary underline"
                  href={`/knowledge?plantId=${pair.plantId}&diseaseId=${pair.diseaseId}`}
                >
                  Bài viết liên quan
                </Link>
                <Link
                  className="text-primary underline"
                  href={`/medicines?plantId=${pair.plantId}&diseaseId=${pair.diseaseId}`}
                >
                  Tra cứu thuốc
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

async function readPublicDetail(
  kind: CatalogKind,
  id: string,
  signal: AbortSignal,
): Promise<CatalogRecord> {
  let backendId = id;
  // Preserve legacy plant/disease URLs; only use the old adapter to resolve identity, never its advice.
  if ((kind === 'plants' || kind === 'diseases') && !/^[0-9a-f-]{36}$/i.test(id)) {
    const { getPlants, getDiseases } = await import('@/services/catalogApi');
    const records = kind === 'plants' ? await getPlants() : await getDiseases();
    backendId =
      records.find((record) => record.id === id || record.backendId === id)?.backendId ?? id;
  }
  return catalogRequest(`/api/${kind}/${encodeURIComponent(backendId)}`, { signal });
}

export function PublicCatalog({ kind, id }: { kind: CatalogKind; id?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const query = params.toString();
  const [filter, setFilter] = useState<CatalogFilter>(() => ({
    search: params.get('search') ?? '',
    plantId: params.get('plantId') ?? '',
    diseaseId: params.get('diseaseId') ?? '',
    pageNumber: Math.max(1, Number(params.get('pageNumber')) || 1),
  }));
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [record, setRecord] = useState<CatalogRecord | null>(null);
  const [pairs, setPairs] = useState<PlantDiseasePair[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const values = new URLSearchParams(query);
    setFilter({
      search: values.get('search') ?? '',
      plantId: values.get('plantId') ?? '',
      diseaseId: values.get('diseaseId') ?? '',
      pageNumber: Math.max(1, Number(values.get('pageNumber')) || 1),
    });
  }, [query]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is the user's explicit retry signal.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    setPage(null);
    setRecord(null);
    Promise.all([
      loadAllPairs(undefined, controller.signal),
      id
        ? readPublicDetail(kind, id, controller.signal)
        : readCatalogPage(kind, filter, undefined, controller.signal),
    ])
      .then(([choices, result]) => {
        if (active) {
          setPairs(choices);
          if ('items' in result) setPage(result);
          else setRecord(result);
        }
      })
      .catch((failure) => {
        if (active) setError(catalogError(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [kind, id, filter, revision]);
  function update(next: CatalogFilter) {
    setFilter(next);
    const values = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) values.set(key, String(value));
    router.push(`${publicPath(kind)}?${values}`, { scroll: false });
  }
  const plants = [
    ...new Map(
      pairs.map((pair) => [pair.plantId, { value: pair.plantId, label: pair.plantName }]),
    ).values(),
  ];
  const diseases = [
    ...new Map(
      pairs
        .filter((pair) => !filter.plantId || pair.plantId === filter.plantId)
        .map((pair) => [pair.diseaseId, { value: pair.diseaseId, label: pair.diseaseName }]),
    ).values(),
  ];
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-12">
      <CatalogLinks />
      {!id && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">{catalogLabels[kind]}</h1>
            <p className="text-muted-foreground">Tra cứu thông tin công khai từ danh mục AgriAI.</p>
          </header>
          <SearchField
            id="public-catalog-search"
            label="Tìm kiếm danh mục"
            value={filter.search ?? ''}
            resetKey={`${kind}:${id ?? ''}:${query}`}
            onChange={(search) => update({ ...filter, search: search.trim(), pageNumber: 1 })}
            submitLabel="Tìm kiếm"
          />
          {(kind === 'medicines' || kind === 'knowledge-documents') && (
            <div className="grid gap-4 sm:grid-cols-2">
              <CatalogSelect
                label="Lọc theo cây"
                value={filter.plantId ?? ''}
                options={plants}
                onChange={(plantId) => update({ ...filter, plantId, diseaseId: '', pageNumber: 1 })}
              />
              <CatalogSelect
                label="Lọc theo bệnh"
                value={filter.diseaseId ?? ''}
                options={diseases}
                onChange={(diseaseId) => update({ ...filter, diseaseId, pageNumber: 1 })}
              />
            </div>
          )}
        </>
      )}
      {loading && <p role="status">Đang tải nội dung...</p>}
      {error && (
        <div className="flex flex-col gap-3">
          <p role="alert" className="text-destructive">
            {error}
          </p>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => setRevision((value) => value + 1)}
          >
            Thử lại
          </Button>
        </div>
      )}
      {record && <CatalogContent kind={kind} record={record} pairs={pairs} />}
      {page && (
        <>
          <ul className="grid gap-4 md:grid-cols-2">
            {page.items.map((item) => (
              <li
                key={item.id}
                className="flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-5"
              >
                <h2 className="break-words text-xl font-semibold">
                  <Link
                    className="text-primary hover:underline"
                    href={`${publicPath(kind)}/${item.id}`}
                  >
                    {recordName(item)}
                  </Link>
                </h2>
                <p className="line-clamp-3 break-words text-muted-foreground">
                  {item.content ??
                    item.targetUse ??
                    item.description ??
                    'Xem thông tin chi tiết trong danh mục.'}
                </p>
                <Link
                  className="mt-auto self-start font-semibold text-primary underline underline-offset-4"
                  href={`${publicPath(kind)}/${item.id}`}
                >
                  Xem chi tiết
                </Link>
              </li>
            ))}
          </ul>
          {page.items.length === 0 && <p>Chưa có nội dung phù hợp được công khai.</p>}
          <CatalogPager
            page={page.pageNumber}
            totalPages={page.totalPages}
            totalCount={page.totalCount}
            onChange={(pageNumber) => update({ ...filter, pageNumber })}
          />
        </>
      )}
    </div>
  );
}
