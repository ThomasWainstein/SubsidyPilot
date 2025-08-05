import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/utils';
import AIFieldClassifier from '../AIFieldClassifier';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(() => Promise.resolve({
        data: {
          classifications: [
            { originalKey: 'foo', suggestedFieldName: 'foo', value: 'bar', confidence: 0.9 }
          ]
        },
        error: null
      }))
    }
  }
}));

describe('AIFieldClassifier', () => {
  it('renders toggle button with aria-label', async () => {
    render(
      <AIFieldClassifier unmappedData={{ foo: 'bar' }} onClassify={vi.fn()} isProcessing={false} />
    );

    const runButton = screen.getByRole('button', { name: /run ai classification/i });
    fireEvent.click(runButton);

    const toggle = await screen.findByLabelText(/toggle acceptance for foo/i);
    expect(toggle).toBeDefined();
  });
});
