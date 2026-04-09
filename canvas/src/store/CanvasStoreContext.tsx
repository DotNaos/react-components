import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { CanvasStoreApi, CanvasStoreWithSubscription } from "./types";

const CanvasStoreContext = createContext<CanvasStoreWithSubscription | null>(
  null,
);

export interface CanvasStoreProviderProps {
  children: ReactNode;
  store: CanvasStoreWithSubscription;
}

/**
 * Provider component for the canvas store.
 * Wrap your canvas components with this to provide access to the store.
 */
export function CanvasStoreProvider({
  children,
  store,
}: CanvasStoreProviderProps): ReactNode {
  return (
    <CanvasStoreContext.Provider value={store}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

/**
 * Hook to access the canvas store.
 * Must be used within a CanvasStoreProvider.
 */
export function useCanvasStore(): CanvasStoreApi {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error("useCanvasStore must be used within a CanvasStoreProvider");
  }
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}

/**
 * Hook to access the raw store (for subscription management).
 */
export function useCanvasStoreRaw(): CanvasStoreWithSubscription {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error(
      "useCanvasStoreRaw must be used within a CanvasStoreProvider",
    );
  }
  return store;
}
