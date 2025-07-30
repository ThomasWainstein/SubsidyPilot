import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import BulkActionBar from '../BulkActionBar';
import { mockFieldData } from '@/test/mocks/reviewData';

const createProps = (selected: string[] = []) => ({
  fields: mockFieldData,
  selectedFields: selected,
  onBulkAccept: vi.fn(),
  onBulkReject: vi.fn(),
  onSelectAll: vi.fn(),
  onSelectNone: vi.fn(),
  onFilterByConfidence: vi.fn(),
});

describe('BulkActionBar', () => {
  it('calls onBulkAccept for selected fields', () => {
    const props = createProps(['farm_name', 'owner_name']);
    render(<BulkActionBar {...props} />);

    const acceptBtn = screen.getByRole('button', { name: /accept selected/i });
    fireEvent.click(acceptBtn);

    expect(props.onBulkAccept).toHaveBeenCalledWith(['farm_name', 'owner_name']);
  });

  it('calls onBulkReject for selected fields', () => {
    const props = createProps(['farm_name']);
    render(<BulkActionBar {...props} />);

    const rejectBtn = screen.getByRole('button', { name: /reject selected/i });
    fireEvent.click(rejectBtn);

    expect(props.onBulkReject).toHaveBeenCalledWith(['farm_name']);
  });

  it('bulk accepts high confidence fields', () => {
    const props = createProps();
    render(<BulkActionBar {...props} />);

    const acceptHigh = screen.getByRole('button', { name: /accept high/i });
    fireEvent.click(acceptHigh);

    const expected = mockFieldData
      .filter(f => f.confidence >= 0.8)
      .map(f => f.key);
    expect(props.onBulkAccept).toHaveBeenCalledWith(expected);
  });

  it('bulk rejects low confidence fields', () => {
    const props = createProps();
    render(<BulkActionBar {...props} />);

    const rejectLow = screen.getByRole('button', { name: /reject low/i });
    fireEvent.click(rejectLow);

    const expected = mockFieldData
      .filter(f => f.confidence < 0.5)
      .map(f => f.key);
    expect(props.onBulkReject).toHaveBeenCalledWith(expected);
  });

  it('filters by confidence level through menu', () => {
    const props = createProps();
    const { container } = render(<BulkActionBar {...props} />);

    const menuButton = container.querySelector('button[aria-haspopup]');
    if (menuButton) fireEvent.click(menuButton);

    fireEvent.click(screen.getByText(/show high confidence only/i));

    expect(props.onFilterByConfidence).toHaveBeenCalledWith('high');
  });

  it('selects and deselects all fields', () => {
    const props = createProps();
    const { container } = render(<BulkActionBar {...props} />);

    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(props.onSelectAll).toHaveBeenCalled();

    fireEvent.click(checkbox);
    expect(props.onSelectNone).toHaveBeenCalled();
  });
});
