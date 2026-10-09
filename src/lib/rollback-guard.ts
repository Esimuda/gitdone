/** Decision the post-deploy guard and the Monitor skill share. */

export const DEFAULT_WINDOW_MINUTES = 5;
export const DEFAULT_MAX_ERROR_RATE = 0.02;

export type GuardSample = {
  healthy: boolean;
  /** Fraction of requests that were 5xx. Null when Cloud Monitoring did not answer. */
  errorRate: number | null;
};

export type GuardDecision = {
  action: "hold" | "rollback";
  reason: string;
};

export function decideRollback(
  samples: GuardSample[],
  maxErrorRate = DEFAULT_MAX_ERROR_RATE,
): GuardDecision {
  if (samples.length === 0) {
    return { action: "rollback", reason: "No health samples in the window." };
  }
  const failed = samples.filter((sample) => !sample.healthy).length;
  if (failed > 0) {
    return {
      action: "rollback",
      reason: `${failed} of ${samples.length} health checks failed.`,
    };
  }
  const rates = samples.map((sample) => sample.errorRate).filter((rate): rate is number => rate !== null);
  if (rates.length === 0) {
    return {
      action: "hold",
      reason: "Health stayed up. Error rate was not available, so the guard held.",
    };
  }
  const worst = Math.max(...rates);
  if (worst > maxErrorRate) {
    return {
      action: "rollback",
      reason: `Error rate ${worst} rose above ${maxErrorRate}.`,
    };
  }
  return {
    action: "hold",
    reason: "Health stayed up and the error rate stayed within the guard.",
  };
}
