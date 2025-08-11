import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DocumentStatusBar } from '../DocumentStatusBar';

describe('DocumentStatusBar', () => {
  it('should render upload status correctly', () => {
    render(
      <DocumentStatusBar
        status="uploading"
        progress={10}
        step="Uploading"
        lastUpdated="2024-01-01T00:00:00Z"
      />
    );

    expect(screen.getByText('Uploading')).toBeDefined();
    expect(screen.getByText('10%')).toBeDefined();
  });

  it('should render completed status correctly', () => {
    render(
      <DocumentStatusBar
        status="completed"
        progress={100}
        step="Complete"
        lastUpdated="2024-01-01T00:00:00Z"
      />
    );

    expect(screen.getByText('Complete')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('should render failed status correctly', () => {
    render(
      <DocumentStatusBar
        status="failed"
        progress={0}
        step="Failed"
        lastUpdated="2024-01-01T00:00:00Z"
      />
    );

    expect(screen.getByText(/Processing failed/)).toBeDefined();
  });

  it('should handle all processing steps', () => {
    const steps = [
      { status: 'uploading', step: 'Upload' },
      { status: 'virus_scan', step: 'Security' },
      { status: 'extracting', step: 'Extract' },
      { status: 'ocr', step: 'OCR' },
      { status: 'ai', step: 'AI Analysis' },
      { status: 'completed', step: 'Complete' }
    ];

    steps.forEach(({ status, step }) => {
      const { unmount } = render(
        <DocumentStatusBar
          status={status as any}
          progress={status === 'completed' ? 100 : 50}
          step={step}
        />
      );

      expect(screen.getByText(step)).toBeDefined();
      unmount();
    });
  });

  it('should display last updated time when provided', () => {
    const lastUpdated = "2024-01-01T12:30:00Z";
    render(
      <DocumentStatusBar
        status="ai"
        progress={80}
        step="AI Analysis"
        lastUpdated={lastUpdated}
      />
    );

    expect(screen.getByText(/Last updated:/)).toBeDefined();
  });

  it('should include proper accessibility attributes', () => {
    render(
      <DocumentStatusBar
        status="extracting"
        progress={45}
        step="Text Extraction"
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-valuenow')).toBe('45');
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
  });
});