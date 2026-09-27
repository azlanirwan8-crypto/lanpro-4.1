declare module "jest-axe" {
  export function axe(
    html: Element | Document,
    options?: Record<string, unknown>
  ): Promise<{ violations: unknown[] }>;

  export const toHaveNoViolations: {
    toHaveNoViolations(received: unknown): { pass: boolean; message(): string };
  };
}

declare namespace jest {
  interface Matchers<R> {
    toHaveNoViolations(): R;
  }
}
