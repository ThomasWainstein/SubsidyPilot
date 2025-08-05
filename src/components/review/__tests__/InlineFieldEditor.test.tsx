import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import InlineFieldEditor from '../InlineFieldEditor';
import { mockFieldData } from '@/test/mocks/reviewData';

// Simple test helpers
const expectElementToExist = (element: HTMLElement | null) => {
  expect(element).not.toBeNull();
};

const expectToHaveAttribute = (element: HTMLElement | null, attribute: string, value?: string) => {
  expect(element?.getAttribute(attribute)).toBe(value || expect.any(String));
};

// Simple user event implementation
const userEvent = {
  setup: () => ({
    click: async (element: Element) => {
      fireEvent.click(element);
    },
    clear: async (element: Element) => {
      fireEvent.change(element, { target: { value: '' } });
    },
    type: async (element: Element, text: string) => {
      fireEvent.change(element, { target: { value: text } });
    }
  })
};

describe('InlineFieldEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnAccept = vi.fn();
  const mockOnReject = vi.fn();

  const defaultProps = {
    field: mockFieldData[0], // farm_name field
    value: mockFieldData[0].value,
    onChange: mockOnChange,
    onAccept: mockOnAccept,
    onReject: mockOnReject,
  };


  it('renders field label and value correctly', () => {
    render(<InlineFieldEditor {...defaultProps} />);
    
    expectElementToExist(screen.getByText('Farm Name'));
    expectElementToExist(screen.getByText('Green Valley Farm'));
  });

  it('shows confidence badge', () => {
    render(<InlineFieldEditor {...defaultProps} />);

    expectElementToExist(screen.getByText('95%'));
  });

  it('has accessible label on edit button', () => {
    render(<InlineFieldEditor {...defaultProps} />);

    const editButton = screen.getByLabelText(/edit farm name field/i);
    expectElementToExist(editButton);
  });

  it('toggles accept state when checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(<InlineFieldEditor {...defaultProps} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /accept farm name/i });
    await user.click(checkbox);
    
    expect(mockOnAccept).toHaveBeenCalledWith('farm_name');
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(<InlineFieldEditor {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    expectElementToExist(screen.getByDisplayValue('Green Valley Farm'));
    expectElementToExist(screen.getByText('Save'));
    expectElementToExist(screen.getByText('Cancel'));
  });

  it('saves changes when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<InlineFieldEditor {...defaultProps} />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    // Modify value
    const input = screen.getByDisplayValue('Green Valley Farm');
    await user.clear(input);
    await user.type(input, 'Updated Farm Name');
    
    // Save changes
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('farm_name', 'Updated Farm Name');
  });

  it('cancels changes when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<InlineFieldEditor {...defaultProps} />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    // Modify value
    const input = screen.getByDisplayValue('Green Valley Farm');
    await user.clear(input);
    await user.type(input, 'Updated Farm Name');
    
    // Cancel changes
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    
    expect(mockOnChange).not.toHaveBeenCalled();
    expectElementToExist(screen.getByText('Green Valley Farm'));
  });

  it('renders number input for number field type', () => {
    const numberField = mockFieldData.find(f => f.type === 'number')!;
    render(<InlineFieldEditor {...defaultProps} field={numberField} value={numberField.value} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    const input = screen.getByDisplayValue('1250');
    expectToHaveAttribute(input, 'type', 'number');
  });

  it('renders switch for boolean field type', () => {
    const booleanField = mockFieldData.find(f => f.type === 'boolean')!;
    render(<InlineFieldEditor {...defaultProps} field={booleanField} value={booleanField.value} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expectElementToExist(screen.getByRole('switch'));
    expectElementToExist(screen.getByText('Yes'));
  });

  it('renders array editor for array field type', () => {
    const arrayField = mockFieldData.find(f => f.type === 'array')!;
    render(<InlineFieldEditor {...defaultProps} field={arrayField} value={arrayField.value} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    // Should show existing array items as badges
    expectElementToExist(screen.getByText('corn'));
    expectElementToExist(screen.getByText('soybeans'));
    expectElementToExist(screen.getByText('wheat'));
  });

  it('shows modified indicator when field has changes', () => {
    const modifiedField = { ...mockFieldData[0], modified: true };
    render(<InlineFieldEditor {...defaultProps} field={modifiedField} />);
    
    expectElementToExist(screen.getByText('Modified'));
  });

  it('disables interactions when disabled prop is true', () => {
    render(<InlineFieldEditor {...defaultProps} disabled={true} />);
    
    const checkbox = screen.getByRole('checkbox');
    const editButton = screen.getByRole('button', { name: /edit/i });
    
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
    expect((editButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('formats date values correctly', () => {
    const dateField = mockFieldData.find(f => f.type === 'date')!;
    render(<InlineFieldEditor {...defaultProps} field={dateField} value={dateField.value} />);
    
    // Should show formatted date
    expectElementToExist(screen.getByText(/May 15, 2010/));
  });

  it('handles array field operations', async () => {
    const user = userEvent.setup();
    const arrayField = mockFieldData.find(f => f.type === 'array')!;
    render(<InlineFieldEditor {...defaultProps} field={arrayField} value={arrayField.value} />);
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);
    
    // Add new item
    const input = screen.getByPlaceholderText('Add crop');
    await user.type(input, 'tomatoes');
    
    const addButton = screen.getByRole('button', { name: /add/i });
    await user.click(addButton);
    
    // Save changes
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(mockOnChange).toHaveBeenCalledWith('crops', ['corn', 'soybeans', 'wheat', 'tomatoes']);
  });

  it('provides aria-labels for array item removal buttons', async () => {
    const user = userEvent.setup();
    const arrayField = mockFieldData.find(f => f.type === 'array')!;
    render(<InlineFieldEditor {...defaultProps} field={arrayField} value={arrayField.value} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    const removeButton = screen.getByLabelText(/remove corn from list/i);
    expectElementToExist(removeButton);
  });
});