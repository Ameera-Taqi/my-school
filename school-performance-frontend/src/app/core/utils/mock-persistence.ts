export function createMockStore<T>(storageKey: string, initialData: T): {
  get(): T;
  set(value: T): void;
  reset(): void;
} {
  const clone = <V>(value: V): V => JSON.parse(JSON.stringify(value)) as V;

  const load = (): T => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        return JSON.parse(raw) as T;
      }
    } catch {
      // ignore corrupted storage
    }
    return clone(initialData);
  };

  let cache = load();

  return {
    get: () => cache,
    set: (value: T) => {
      cache = value;
      localStorage.setItem(storageKey, JSON.stringify(value));
    },
    reset: () => {
      cache = clone(initialData);
      localStorage.removeItem(storageKey);
    }
  };
}

export function createListStore<T extends { id?: number }>(
  storageKey: string,
  initialItems: T[],
  initialNextId: number
) {
  type State = { items: T[]; nextId: number };
  const store = createMockStore<State>(storageKey, { items: initialItems, nextId: initialNextId });

  return {
    getItems(): T[] {
      return store.get().items;
    },
    setItems(items: T[]): void {
      store.set({ ...store.get(), items });
    },
    nextId(): number {
      const current = store.get();
      const next = current.nextId + 1;
      store.set({ ...current, nextId: next });
      return next;
    },
    reset(): void {
      store.reset();
    }
  };
}
