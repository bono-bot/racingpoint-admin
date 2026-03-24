export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  onStateChange?: (state: CircuitState) => void;
}

const DEFAULT_OPTIONS: Required<Pick<CircuitBreakerOptions, 'failureThreshold' | 'cooldownMs'>> = {
  failureThreshold: 3,
  cooldownMs: 30_000,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private onStateChange?: (state: CircuitState) => void;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.failureThreshold = options.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold;
    this.cooldownMs = options.cooldownMs ?? DEFAULT_OPTIONS.cooldownMs;
    this.onStateChange = options.onStateChange;
  }

  getState(): CircuitState {
    return this.state;
  }

  private transition(newState: CircuitState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.onStateChange?.(newState);
    }
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.cooldownMs) {
        this.transition('half-open');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    if (this.state === 'half-open') {
      try {
        const result = await fn();
        this.failureCount = 0;
        this.transition('closed');
        return result;
      } catch (error: unknown) {
        this.lastFailureTime = Date.now();
        this.transition('open');
        throw error;
      }
    }

    // state === 'closed'
    try {
      const result = await fn();
      this.failureCount = 0;
      return result;
    } catch (error: unknown) {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.lastFailureTime = Date.now();
        this.transition('open');
      }
      throw error;
    }
  }

  setOnStateChange(callback: ((state: CircuitState) => void) | undefined): void {
    this.onStateChange = callback;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.transition('closed');
  }
}

export const circuitBreaker = new CircuitBreaker();
