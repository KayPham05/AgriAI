'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BookOpen, Leaf, ScanLine, ShieldCheck } from 'lucide-react';
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
import { ReferenceImage } from '@/components/common/ReferenceImage';
import { catalogImageSource } from '@/lib/catalogImages';
import { plantCategory } from '@/lib/plantCategories';
import { Button } from '@/components/ui/button';
import { SearchField } from '@/components/common/CatalogControls';
import { findPlantTemplate } from '@/services/catalogApi';
import { CatalogPager, CatalogSelect } from './CatalogControls';
import { catalogError, catalogLabels, contentFields, publicPath, safeSource } from './catalogUi';
import { PublicCatalogCard } from './PublicCatalogCard';

function PlantDetailContent({
  record,
  plant,
  linkedPairs,
}: {
  record: CatalogRecord;
  plant: NonNullable<ReturnType<typeof findPlantTemplate>>;
  linkedPairs: PlantDiseasePair[];
}) {
  const name = recordName(record);
  const scientificName = record.scientificName || plant.scientificName;
  const description = record.description || plant.description;
  const uploaded = catalogImageSource(record.imageUrl);

  return (
    <article className="flex min-w-0 flex-col gap-8">
      <Button asChild variant="ghost" className="self-start px-0">
        <Link href={publicPath('plants')}>
          <ArrowLeft aria-hidden="true" />
          Về danh sách cây trồng
        </Link>
      </Button>

      <section
        aria-labelledby="plant-detail-title"
        className="overflow-hidden rounded-media border border-border bg-surface"
      >
        <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="min-h-72 bg-surface-muted md:min-h-full">
            <Image
              src={uploaded ?? plant.imageUrl}
              unoptimized={Boolean(uploaded)}
              alt={name}
              width={960}
              height={720}
              sizes="(min-width: 768px) 52vw, 100vw"
              className="h-full min-h-72 w-full object-cover md:min-h-[28rem]"
            />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
              <span className="rounded-full bg-secondary px-3 py-1.5">
                {record.category ? plantCategory(record.category) : plant.category}
              </span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Leaf className="size-4" aria-hidden="true" />
                Cẩm nang cây trồng
              </span>
            </div>
            <h1
              id="plant-detail-title"
              className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            >
              {name}
            </h1>
            {scientificName && (
              <p className="mt-2 text-base italic text-muted-foreground">{scientificName}</p>
            )}
            <p className="mt-6 max-w-prose text-base leading-7 text-muted-foreground">
              {description}
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-4 border-y border-border py-4">
              <div>
                <dt className="text-sm text-muted-foreground">Tình trạng tham khảo</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">{plant.conditions.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Dấu hiệu mô hình nhận biết</dt>
                <dd className="mt-1 text-2xl font-bold text-primary">{plant.detectableCount}</dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/diagnose">
                  <ScanLine aria-hidden="true" />
                  Kiểm tra lá
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={publicPath('plants')}>Xem cây khác</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="plant-conditions-title" className="border-t border-border pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">Nhận diện qua lá</p>
            <h2 id="plant-conditions-title" className="mt-2 text-2xl font-bold sm:text-3xl">
              Dấu hiệu trên lá tham khảo
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Đối chiếu nhanh các tình trạng thường gặp của {name}. Hình ảnh và mô tả chỉ dùng để
              tham khảo trong quá trình kiểm tra.
            </p>
          </div>
          <span className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-primary">
            {plant.conditions.length} tình trạng
          </span>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plant.conditions.map((condition) => (
            <article
              key={condition.id}
              className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-surface"
            >
              <ReferenceImage src={condition.imageUrl} alt={condition.name} />
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold leading-7">{condition.name}</h3>
                  {condition.isHealthy && (
                    <ShieldCheck
                      className="mt-1 size-5 shrink-0 text-primary"
                      aria-label="Lá khỏe mạnh"
                    />
                  )}
                </div>
                {condition.scientificName && (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    {condition.scientificName}
                  </p>
                )}
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {condition.shortDescription}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="plant-related-title" className="border-t border-border pt-8">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-card bg-secondary text-primary">
            <BookOpen aria-hidden="true" />
          </span>
          <div>
            <h2 id="plant-related-title" className="text-2xl font-bold">
              Tra cứu liên quan
            </h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Mở bài viết và thông tin sản phẩm theo từng cặp cây trồng và bệnh đã được công khai.
            </p>
          </div>
        </div>
        {linkedPairs.length > 0 ? (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {linkedPairs.map((pair) => (
              <li
                key={pair.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-foreground">{pair.diseaseName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{pair.plantName}</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <Link
                    className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
                    href={`/knowledge?plantId=${pair.plantId}&diseaseId=${pair.diseaseId}`}
                  >
                    Trích xuất liên quan
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline"
                    href={`/medicines?plantId=${pair.plantId}&diseaseId=${pair.diseaseId}`}
                  >
                    Tra cứu thuốc
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 rounded-card border border-border bg-surface-muted p-5 text-muted-foreground">
            Chưa có nội dung liên quan được công khai cho cây trồng này.
          </p>
        )}
      </section>

      <p className="border-t border-border pt-5 text-sm leading-7 text-muted-foreground">
        Thông tin trên trang mang tính tham khảo. Khi cây có dấu hiệu bất thường, hãy đối chiếu thêm
        với cán bộ kỹ thuật địa phương.
      </p>
    </article>
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
  const plant =
    kind === 'plants'
      ? findPlantTemplate({
          name: record.name ?? '',
          vietnameseName: record.vietnameseName ?? null,
        })
      : undefined;

  if (plant) {
    return <PlantDetailContent record={record} plant={plant} linkedPairs={linkedPairs} />;
  }

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
      {(kind === 'plants' || kind === 'diseases') && record.imageUrl && (
        <ReferenceImage
          src={catalogImageSource(record.imageUrl)}
          alt={recordName(record)}
          className="max-w-2xl rounded-media"
        />
      )}
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
          {record.uses?.map((use) => {
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
          {!record.uses?.length && <p>Chưa có hướng dẫn sử dụng được công khai.</p>}
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
                  Trích xuất liên quan
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
          <ul
            className={
              kind === 'knowledge-documents'
                ? 'grid gap-4 md:grid-cols-2'
                : 'grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }
          >
            {page.items.map((item) =>
              kind !== 'knowledge-documents' ? (
                <li key={item.id} className="min-w-0">
                  <PublicCatalogCard kind={kind} record={item} pairs={pairs} />
                </li>
              ) : (
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
                      item.activeIngredient ??
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
              ),
            )}
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
