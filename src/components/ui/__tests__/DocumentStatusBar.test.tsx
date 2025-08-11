import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

    expect(screen.getByText('Uploading')).toBeInTheDocument();
    expect(screen.getByText('10%')).toBeInTheDocument();
    
    // Check that upload step is highlighted
    const uploadStep = screen.getByText('Upload').closest('div');
    expect(uploadStep).toHaveClass('text-primary');
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

    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    // All steps should be marked as completed
    const completeIcons = screen.getAllByTestId('check-circle');
    expect(completeIcons.length).toBeGreaterThan(0);
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

    expect(screen.getByText('Processing failed at failed step')).toBeInTheDocument();
    
    // Should show error styling
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-destructive');
  });

  it('should show loading animation for current step', () => {
    render(
      <DocumentStatusBar
        status="extracting"
        progress={40}
        step="Text Extraction"
      />
    );

    // Current step should have loading animation
    const extractStep = screen.getByText('Extract').closest('div');
    expect(extractStep).toHaveClass('text-primary');
    
    // Should show loading spinner for current step
    const spinner = screen.getByTestId('loader');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should display last updated time', () => {
    const lastUpdated = "2024-01-01T12:30:00Z";
    render(
      <DocumentStatusBar
        status="ai"
        progress={80}
        step="AI Analysis"
        lastUpdated={lastUpdated}
      />
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
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
      const { rerender } = render(
        <DocumentStatusBar
          status={status as any}
          progress={status === 'completed' ? 100 : 50}
          step={step}
        />
      );

      expect(screen.getByText(step)).toBeInTheDocument();
      
      // Clean up for next iteration
      rerender(<div />);
    });
  });

  it('should apply custom className', () => {
    const { container } = render(
      <DocumentStatusBar
        status="uploading"
        progress={10}
        step="Uploading"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should show correct progress bar color based on status', () => {
    // Test different status colors
    const testCases = [
      { status: 'failed', expectedClass: 'bg-destructive' },
      { status: 'completed', expectedClass: 'bg-success' },
      { status: 'extracting', expectedClass: 'bg-primary' }
    ];

    testCases.forEach(({ status, expectedClass }) => {
      const { rerender } = render(
        <DocumentStatusBar
          status={status as any}
          progress={status === 'failed' ? 0 : 50}
          step={status}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.firstChild).toHaveClass(expectedClass);
      
      rerender(<div />);
    });
  });
});