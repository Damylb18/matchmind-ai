import { AiError } from "./client.js";
import type { AiConfig } from "./config.js";

export type JobKind = "insight" | "recap";

type Job = {
  kind: JobKind;
  key: string;
  run: () => Promise<unknown>;
  resolve: (value: unknown) => void;
};

export type SchedulerStats = {
  callsStarted: number;
  insightCalls: number;
  recapCalls: number;
  succeeded: number;
  failed: number;
  rejected: number;
  queued: number;
  stopped?: string | null;
};

type Clock = { now: () => number; sleep: (ms: number) => Promise<void> };

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Runs OpenAI work off the match loop: one call at a time, spaced by minIntervalMs,
 * with a bounded queue, a per-match budget and a result cache. A job that is not
 * accepted, fails or times out resolves to null, so callers keep their fallback text.
 */
export class AiScheduler {
  private queue: Job[] = [];
  /** Set after a fatal API error (e.g. a rejected key): no further calls this run. */
  private stopped: string | null = null;
  private running = false;
  private lastStart = 0;
  private cache = new Map<string, Promise<unknown>>();
  private stats: SchedulerStats = {
    callsStarted: 0,
    insightCalls: 0,
    recapCalls: 0,
    succeeded: 0,
    failed: 0,
    rejected: 0,
    queued: 0,
  };

  constructor(
    private config: AiConfig,
    private log: (message: string) => void = console.log,
    private clock: Clock = realClock,
  ) {}

  /** Budget left for this kind of job, counting calls already accepted. */
  private hasBudget(kind: JobKind) {
    const accepted = this.stats.insightCalls + this.stats.recapCalls;
    if (accepted >= this.config.maxCallsPerMatch) return false;
    return kind === "recap" || this.stats.insightCalls < this.config.maxInsightCalls;
  }

  /**
   * Queues `run` unless it is cached, over budget or the queue is full. Recaps go to the
   * front of the queue and are never dropped for queue length.
   */
  submit<T>(kind: JobKind, key: string, run: () => Promise<T>): Promise<T | null> {
    const cached = this.cache.get(key);
    if (cached) return cached as Promise<T | null>;

    if (!this.config.enabled || this.stopped) return Promise.resolve(null);
    if (!this.hasBudget(kind)) {
      this.stats.rejected++;
      this.log(`[ai] ${key}: skipped — per-match call budget used`);
      return Promise.resolve(null);
    }
    if (kind === "insight" && this.queue.filter((job) => job.kind === "insight").length >= this.config.queueSize) {
      this.stats.rejected++;
      this.log(`[ai] ${key}: skipped — queue full`);
      return Promise.resolve(null);
    }

    if (kind === "insight") this.stats.insightCalls++;
    else this.stats.recapCalls++;

    const promise = new Promise<unknown>((resolve) => {
      const job: Job = { kind, key, run, resolve };
      if (kind === "recap") this.queue.unshift(job);
      else this.queue.push(job);
    });
    this.cache.set(key, promise);
    void this.drain();
    return promise as Promise<T | null>;
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const wait = this.lastStart + this.config.minIntervalMs - this.clock.now();
        if (wait > 0) await this.clock.sleep(wait);
        const job = this.queue.shift();
        if (!job) break;
        this.lastStart = this.clock.now();
        this.stats.callsStarted++;
        try {
          job.resolve(await job.run());
          this.stats.succeeded++;
        } catch (error) {
          this.stats.failed++;
          this.log(`[ai] ${job.key}: failed — ${error instanceof Error ? error.message : String(error)}; using fallback`);
          job.resolve(null);
          if (error instanceof AiError && error.fatal) {
            this.stopped = error.message;
            this.log("[ai] OpenAI turned off for this run after a fatal error; templates continue");
            for (const queued of this.queue.splice(0)) queued.resolve(null);
          }
        }
      }
    } finally {
      this.running = false;
    }
  }

  getStats(): SchedulerStats {
    return { ...this.stats, queued: this.queue.length, stopped: this.stopped };
  }
}
