export function memoize<T>(producer: () => T): () => T {
  let value: T | null = null;
  return () => {
    if (value == null) {
      value = producer();
    }
    return value;
  };
}
