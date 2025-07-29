/// <reference types="vitest" />
/// <reference types="vite/client" />

declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeInTheDocument(): T
      toHaveClass(className: string): T
      toBeVisible(): T
      toBeDisabled(): T
      toBeEnabled(): T
      toHaveValue(value: string | number): T
      toHaveTextContent(text: string): T
      toHaveAttribute(attr: string, value?: string): T
      toBeChecked(): T
      toHaveFocus(): T
      toBeEmptyDOMElement(): T
      toContainElement(element: HTMLElement): T
    }
  }
}