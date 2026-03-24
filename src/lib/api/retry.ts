export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Pick<RetryOptions, 'maxRetries' | 'baseDelayMs'>> = {
  maxRetries: 3,
  baseDelayMs: 1_000,
};

function defaultShouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes('Circuit breaker is open')) return false;
    // Check for 4xx client errors (status starts with '4')
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch && statusMatch[1].startsWith('4')) return false;
  }
  return true;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>
): Promise<T> {
  const maxRetries = options?.maxRetries ?? DEFAULT_OPTIONS.maxRetries;
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_OPTIONS.baseDelayMs;
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (attempt === maxRetries) break;
      if (!shouldRetry(error)) throw error;

      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
