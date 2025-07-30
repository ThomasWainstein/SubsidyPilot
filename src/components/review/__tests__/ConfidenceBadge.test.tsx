import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/utils';
import ConfidenceBadge from '../ConfidenceBadge';

// Simple test matchers
const expectElementToExist = (element: HTMLElement | null) => {
  expect(element).not.toBeNull();
};

const expectToHaveClass = (element: HTMLElement | null, className: string) => {
  expect(element?.classList.contains(className)).toBe(true);
};

describe('ConfidenceBadge', () => {
  it('renders high confidence with green styling', () => {
    render(<ConfidenceBadge confidence={0.92} />);
    
    const badge = screen.getByText('92%');
    expectElementToExist(badge);
    expectToHaveClass(badge.closest('div'), 'text-green-700');
  });

  it('renders medium confidence with orange styling', () => {
    render(<ConfidenceBadge confidence={0.67} />);
    
    const badge = screen.getByText('67%');
    expectElementToExist(badge);
    expectToHaveClass(badge.closest('div'), 'text-orange-700');
  });

  it('renders low confidence with red styling', () => {
    render(<ConfidenceBadge confidence={0.32} />);
    
    const badge = screen.getByText('32%');
    expectElementToExist(badge);
    expectToHaveClass(badge.closest('div'), 'text-red-700');
  });

  it('displays trending up icon for high confidence', () => {
    render(<ConfidenceBadge confidence={0.85} />);
    
    const trendingUpIcon = document.querySelector('[data-lucide="trending-up"]');
    expectElementToExist(trendingUpIcon as HTMLElement);
  });

  it('displays minus icon for medium confidence', () => {
    render(<ConfidenceBadge confidence={0.65} />);
    
    const minusIcon = document.querySelector('[data-lucide="minus"]');
    expectElementToExist(minusIcon as HTMLElement);
  });

  it('displays trending down icon for low confidence', () => {
    render(<ConfidenceBadge confidence={0.35} />);
    
    const trendingDownIcon = document.querySelector('[data-lucide="trending-down"]');
    expectElementToExist(trendingDownIcon as HTMLElement);
  });

  it('supports different sizes', () => {
    const { rerender } = render(<ConfidenceBadge confidence={0.75} size="sm" />);
    
    let badge = screen.getByText('75%').closest('div');
    expectToHaveClass(badge, 'text-xs');
    
    rerender(<ConfidenceBadge confidence={0.75} size="lg" />);
    badge = screen.getByText('75%').closest('div');
    expectToHaveClass(badge, 'text-base');
  });

  it('shows field name in tooltip when provided', () => {
    render(<ConfidenceBadge confidence={0.85} field="Farm Name" />);
    
    const helpIcon = document.querySelector('[data-lucide="help-circle"]');
    expectElementToExist(helpIcon as HTMLElement);
  });
});