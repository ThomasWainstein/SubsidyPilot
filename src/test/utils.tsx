import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a custom render function that includes providers
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
}

const AllTheProviders = ({ children, initialEntries = ['/'] }: { children: React.ReactNode; initialEntries?: string[] }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const customRender = (ui: React.ReactElement, options: CustomRenderOptions = {}) => {
  const { initialEntries, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} initialEntries={initialEntries} />,
    ...renderOptions,
  });
};

export * from '@testing-library/react';
export { customRender as render };