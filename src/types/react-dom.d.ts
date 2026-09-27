declare module "react-dom" {
  export function createPortal(
    children: React.ReactNode,
    container: Element | DocumentFragment,
    key?: null | string
  ): React.ReactPortal;
  export function flushSync<R>(fn: () => R): R;
}

declare module "react-dom/client" {
  import React from "react";
  export interface Root {
    render(children: React.ReactNode): void;
    unmount(): void;
  }
  export function createRoot(container: Element | DocumentFragment): Root;
  export function hydrateRoot(
    container: Element | DocumentFragment,
    children: React.ReactNode
  ): Root;
}
