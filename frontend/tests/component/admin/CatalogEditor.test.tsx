import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CatalogEditor } from '@/features/knowledge/CatalogEditor';
import { article, pair, medicine } from '../../helpers/knowledge';

describe('catalog content editor', () => {
  it('saves medicine content without the retired target-use field', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<CatalogEditor kind="medicines" record={medicine} pairs={[pair]} onSave={save} />);
    expect(screen.queryByLabelText('Đối tượng sử dụng')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(save.mock.calls[0][0]).not.toHaveProperty('targetUse');
  });
  it('lets an admin classify a disease without automatically approving its content', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const dirty = vi.fn();
    render(
      <CatalogEditor
        kind="diseases"
        record={{
          id: 'disease-a',
          name: 'Cháy lá',
          conditionType: 'Unknown',
          isContentApproved: true,
          isActive: true,
          createdAt: '',
        }}
        pairs={[pair]}
        onSave={save}
        onDirtyChange={dirty}
      />,
    );
    // Exercise keyboard selection; jsdom has no pointer capture/layout scrolling.
    const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {},
    });
    try {
      fireEvent.keyDown(screen.getByRole('combobox', { name: 'Phân loại tình trạng' }), {
        key: 'Enter',
      });
      fireEvent.keyDown(await screen.findByRole('option', { name: /^Bệnh$/ }), { key: 'Enter' });
    } finally {
      if (originalScroll)
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll);
      else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
    await userEvent.click(screen.getByRole('button', { name: 'Lưu nội dung' }));
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ conditionType: 'Disease', isActive: true }),
    );
    expect(save.mock.calls[0][0]).not.toHaveProperty('isContentApproved');
    expect(dirty).toHaveBeenCalledWith(true);
  });
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
