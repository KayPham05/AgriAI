'use client';
import { useEffect, useRef, useState } from 'react';
import {
  catalogPath,
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
import { Badge } from '@/components/ui/badge';
import { CatalogEditor } from './CatalogEditor';
import { CatalogPager, CatalogSelect, ConfirmAction } from './CatalogControls';
import { MedicineUses } from './MedicineUses';
import { catalogError, catalogLabels } from './catalogUi';

export function KnowledgeAdmin({ kind, token }: { kind: CatalogKind; token: string }) {
  const [filter, setFilter] = useState<CatalogFilter>({ pageNumber: 1 });
  const [page, setPage] = useState<CatalogPage | null>(null);
  const [pairs, setPairs] = useState<PlantDiseasePair[]>([]);
  const [record, setRecord] = useState<CatalogRecord | null>(null);
  const [revision, setRevision] = useState(0);
  const [editorVersion, setEditorVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownPending, setPending] = useState(false);
  const [usePending, setUsePending] = useState(false);
  const pending = ownPending || usePending;
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<null | { text: string; action: () => void }>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision explicitly invalidates the list after mutations and retries.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    setPage(null);
    Promise.all([
      readCatalogPage(kind, filter, token, controller.signal),
      loadAllPairs(token, controller.signal),
    ])
      .then(([result, choices]) => {
        if (active) {
          setPage(result);
          setPairs(choices);
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
  }, [kind, filter, token, revision]);

  async function open(id: string) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      setRecord(
        await catalogRequest<CatalogRecord>(`${catalogPath(kind, token)}/${id}`, { token }),
      );
      setDirty(false);
      setEditorVersion((value) => value + 1);
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function back() {
    const close = () => {
      setRecord(null);
      setDirty(false);
      setError('');
      setNotice('');
    };
    if (dirty) setConfirm({ text: 'Bỏ các thay đổi nội dung chưa lưu?', action: close });
    else close();
  }
  async function refreshRecord() {
    if (!record?.id) return;
    try {
      const current = await catalogRequest<CatalogRecord>(
        `${catalogPath(kind, token)}/${record.id}`,
        { token },
      );
      setRecord(current);
      setEditorVersion((value) => value + 1);
      setRevision((value) => value + 1);
    } catch (failure) {
      // A child mutation may have revoked parent publication; stale approval must not remain actionable.
      setRecord(null);
      setError(`Thao tác đã lưu nhưng chưa tải lại được dữ liệu. ${catalogError(failure)}`);
      throw failure;
    }
  }
  async function save(body: Record<string, unknown>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setNotice('');
    try {
      const result = await catalogRequest<CatalogRecord>(
        `${catalogPath(kind, token)}${record?.id ? `/${record.id}` : ''}`,
        { token, method: record?.id ? 'PUT' : 'POST', body },
      );
      setRecord(result);
      setDirty(false);
      setEditorVersion((value) => value + 1);
      setRevision((value) => value + 1);
      setNotice(
        kind === 'plants'
          ? 'Đã lưu nội dung.'
          : 'Đã lưu nội dung. Kiểm tra trạng thái duyệt trước khi công khai.',
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  async function change(
    action: 'approve' | 'publish' | 'hide' | 'revoke' | 'restore' | 'deactivate',
  ) {
    if (!record?.id || lock.current || dirty) return;
    lock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const path = `${catalogPath(kind, token)}/${record.id}`;
      if (action === 'deactivate') {
        await catalogRequest(path, { token, method: 'DELETE' });
        await refreshRecord();
      } else if (kind === 'plants' || kind === 'diseases') {
        if (action === 'restore') {
          const body = Object.fromEntries(
            (kind === 'plants'
              ? ['name', 'vietnameseName', 'scientificName', 'description']
              : ['name', 'vietnameseName', 'description', 'symptoms', 'treatment', 'prevention']
            ).map((key) => [key, record[key as keyof CatalogRecord] ?? null]),
          );
          setRecord(
            await catalogRequest(path, { token, method: 'PUT', body: { ...body, isActive: true } }),
          );
        } else
          setRecord(
            await catalogRequest(`/api/admin/diseases/${record.id}/approval`, {
              token,
              method: 'PUT',
              body: { isContentApproved: action === 'approve' },
            }),
          );
      } else {
        setRecord(
          await catalogRequest(`${path}/publication`, {
            token,
            method: 'PUT',
            body: {
              isActive: true,
              isApproved:
                action === 'restore' || action === 'revoke'
                  ? false
                  : action === 'approve' || Boolean(record.isApproved),
              isPublic: action === 'publish',
            },
          }),
        );
      }
      setRevision((value) => value + 1);
      setNotice('Đã cập nhật trạng thái từ máy chủ.');
    } catch (failure) {
      setError(catalogError(failure));
    } finally {
      lock.current = false;
      setPending(false);
    }
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
  const catalog = kind === 'plants' || kind === 'diseases';
  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-6"
      aria-label={`Quản lý ${catalogLabels[kind]}`}
    >
      {error && (
        <div role="alert" className="text-destructive">
          {error}
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => setRevision((value) => value + 1)}
          >
            Thử lại
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      {!record ? (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <SearchField
              id="catalog-admin-search"
              label="Tìm trong danh mục"
              value={filter.search ?? ''}
              onChange={(search) =>
                setFilter((current) => ({ ...current, search: search.trim(), pageNumber: 1 }))
              }
              submitLabel="Tìm kiếm"
            />
            <Button
              variant="outline"
              disabled={loading || pending}
              onClick={() => {
                setRecord({ id: '', isActive: true, createdAt: '', plantDiseaseIds: [] });
                setDirty(false);
              }}
            >
              Thêm mới
            </Button>
          </div>
          {!catalog && (
            <div className="grid gap-3 sm:grid-cols-2">
              <CatalogSelect
                label="Lọc theo cây"
                value={filter.plantId ?? ''}
                options={plants}
                onChange={(plantId) =>
                  setFilter((current) => ({ ...current, plantId, diseaseId: '', pageNumber: 1 }))
                }
              />
              <CatalogSelect
                label="Lọc theo bệnh"
                value={filter.diseaseId ?? ''}
                options={diseases}
                onChange={(diseaseId) =>
                  setFilter((current) => ({ ...current, diseaseId, pageNumber: 1 }))
                }
              />
            </div>
          )}
          {loading && <p role="status">Đang tải danh mục...</p>}
          {page && (
            <>
              <ul className="flex flex-col gap-3">
                {page.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4"
                  >
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">{recordName(item)}</h2>
                      <p className="text-sm text-muted-foreground">
                        {item.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                        {!catalog && `; ${item.isPublic ? 'công khai' : 'chưa công khai'}`}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={pending}
                      aria-label={`Mở ${recordName(item)}`}
                      onClick={() => void open(item.id)}
                    >
                      Chi tiết / sửa
                    </Button>
                  </li>
                ))}
              </ul>
              {page.items.length === 0 && <p>Chưa có kết quả phù hợp.</p>}
              <CatalogPager
                page={page.pageNumber}
                totalPages={page.totalPages}
                totalCount={page.totalCount}
                onChange={(pageNumber) => setFilter((current) => ({ ...current, pageNumber }))}
              />
            </>
          )}
        </>
      ) : (
        <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4 sm:p-6">
          <Button variant="outline" className="self-start" disabled={pending} onClick={back}>
            Về danh sách
          </Button>
          <h2 className="break-words text-2xl font-bold">
            {record.id ? recordName(record) : `Thêm ${catalogLabels[kind].toLocaleLowerCase('vi')}`}
          </h2>
          {record.id && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {record.isActive ? 'Đang hoạt động' : 'Đã ngừng hoạt động'}
                </Badge>
                {kind !== 'plants' && (
                  <Badge variant="outline">
                    {(kind === 'diseases' ? record.isContentApproved : record.isApproved)
                      ? 'Đã duyệt'
                      : 'Chưa duyệt'}
                  </Badge>
                )}
                {!catalog && (
                  <Badge variant="outline">
                    {record.isPublic ? 'Đang công khai' : 'Chưa công khai'}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {!record.isActive ? (
                  <Button disabled={pending || dirty} onClick={() => void change('restore')}>
                    Khôi phục hoạt động
                  </Button>
                ) : (
                  <>
                    {kind !== 'plants' && (
                      <Button
                        disabled={pending || dirty}
                        variant="outline"
                        onClick={() =>
                          void change(
                            (kind === 'diseases' ? record.isContentApproved : record.isApproved)
                              ? 'revoke'
                              : 'approve',
                          )
                        }
                      >
                        {(kind === 'diseases' ? record.isContentApproved : record.isApproved)
                          ? 'Thu hồi duyệt'
                          : 'Duyệt nội dung'}
                      </Button>
                    )}
                    {!catalog && (
                      <Button
                        disabled={pending || dirty || !record.isApproved}
                        onClick={() => void change(record.isPublic ? 'hide' : 'publish')}
                      >
                        {record.isPublic ? 'Ẩn công khai' : 'Công khai'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      disabled={pending || dirty}
                      onClick={() =>
                        setConfirm({
                          text: 'Ngừng hoạt động mục này? Dữ liệu được giữ lại và không còn xuất hiện trong tra cứu công khai.',
                          action: () => void change('deactivate'),
                        })
                      }
                    >
                      Ngừng hoạt động
                    </Button>
                  </>
                )}
              </div>
              {dirty && (
                <p className="text-sm text-muted-foreground">
                  Lưu nội dung hoặc bỏ thay đổi trước khi chuyển trạng thái.
                </p>
              )}
            </>
          )}
          <CatalogEditor
            key={`${record.id}-${editorVersion}`}
            kind={kind}
            record={record}
            pairs={pairs}
            onSave={save}
            onDirtyChange={setDirty}
            disabled={pending}
          />
          {kind === 'medicines' && record.id && (
            <MedicineUses
              record={record}
              pairs={pairs}
              token={token}
              onRefresh={refreshRecord}
              onBusyChange={(value) => {
                lock.current = value;
                setUsePending(value);
              }}
              disabled={pending || dirty || !record.isActive}
            />
          )}
        </section>
      )}
      {confirm && (
        <ConfirmAction
          text={confirm.text}
          onConfirm={confirm.action}
          onClose={() => setConfirm(null)}
        />
      )}
    </section>
  );
}
