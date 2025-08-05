import { beforeAll, vi } from 'vitest';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'mock-url' } }))
      }))
    },
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      insert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn()
    }))
  }
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  }
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
  useToast: () => ({
    toast: vi.fn()
  })
}));

beforeAll(() => {
  // Global test setup
});