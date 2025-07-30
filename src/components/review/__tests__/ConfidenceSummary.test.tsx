import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import ConfidenceSummary from '../ConfidenceSummary';
import { mockFieldData } from '@/test/mocks/reviewData';

// Simple test helpers
const expectElementToExist = (element: HTMLElement | null) => {
  expect(element).not.toBeNull();
};

const expectToHaveClass = (element: HTMLElement | null, className: string) => {
  expect(element?.classList.contains(className)).toBe(true);
};

describe('ConfidenceSummary', () => {
  it('renders "No fields" when empty field array', () => {
    render(<ConfidenceSummary fields={[]} />);
    
    expectElementToExist(screen.getByText('No fields'));
  });

  it('displays confidence counts correctly', () => {
    render(<ConfidenceSummary fields={mockFieldData} />);
    
    // Should show counts for high, medium, and low confidence
    expectElementToExist(screen.getByText(/\d+H/)); // High confidence count
    expectElementToExist(screen.getByText(/\d+M/)); // Medium confidence count
    expectElementToExist(screen.getByText(/\d+L/)); // Low confidence count
  });

  it('shows high confidence badge with green styling', () => {
    const highConfidenceFields = mockFieldData.filter(f => f.confidence >= 0.8);
    render(<ConfidenceSummary fields={highConfidenceFields} />);
    
    const highBadge = screen.getByText(`${highConfidenceFields.length}H`);
    expectToHaveClass(highBadge, 'text-green-700');
  });

  it('shows medium confidence badge with orange styling', () => {
    const mediumConfidenceFields = mockFieldData.filter(f => f.confidence >= 0.5 && f.confidence < 0.8);
    render(<ConfidenceSummary fields={mediumConfidenceFields} />);
    
    const mediumBadge = screen.getByText(`${mediumConfidenceFields.length}M`);
    expectToHaveClass(mediumBadge, 'text-orange-700');
  });

  it('shows low confidence badge with red styling', () => {
    const lowConfidenceFields = mockFieldData.filter(f => f.confidence < 0.5);
    render(<ConfidenceSummary fields={lowConfidenceFields} />);
    
    const lowBadge = screen.getByText(`${lowConfidenceFields.length}L`);
    expectToHaveClass(lowBadge, 'text-red-700');
  });

  it('calculates and displays average confidence correctly', () => {
    render(<ConfidenceSummary fields={mockFieldData} />);
    
    const avgConfidence = mockFieldData.reduce((sum, field) => sum + field.confidence, 0) / mockFieldData.length;
    const expectedPercentage = Math.round(avgConfidence * 100);
    
    expectElementToExist(screen.getByText(`${expectedPercentage}%`));
  });

  it('applies custom className', () => {
    const { container } = render(<ConfidenceSummary fields={mockFieldData} className="custom-class" />);
    
    expectToHaveClass(container.firstChild as HTMLElement, 'custom-class');
  });
});