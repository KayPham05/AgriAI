import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CatalogEditor } from '@/features/knowledge/CatalogEditor';
import { article, pair } from '../../helpers/knowledge';

describe('catalog content editor', () => {
  it('rejects whitespace and unsafe source URLs without calling save', async () => {
    const save = vi.fn();
    render(
      <CatalogEditor
        kind="knowledge-documents"
        record={{ ...article, title: ' ', sourceUrl: 'javascript:alert(1)' }}
        pairs={[pair]}
        onSave={save}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('submits content and selected GUIDs without retaining publication flags', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <CatalogEditor kind="knowledge-documents" record={article} pairs={[pair]} onSave={save} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Cà chua/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(save).toHaveBeenCalledWith({
      title: 'Chăm sóc vườn',
      content: 'Nội dung đã duyệt',
      sourceUrl: 'https://example.test/source',
      plantDiseaseIds: [],
    });
  });
  it('keeps input and displays a server error when saving fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('Nguồn không hợp lệ'));
    render(
      <CatalogEditor kind="knowledge-documents" record={article} pairs={[pair]} onSave={save} />,
    );
    await userEvent.type(screen.getByLabelText('Tiêu đề'), ' mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Nguồn không hợp lệ');
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Chăm sóc vườn mới');
  });
});
