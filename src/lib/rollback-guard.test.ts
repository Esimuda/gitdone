import { describe, expect, it } from "vitest";
import { decideRollback } from "./rollback-guard";

describe("decideRollback", () => {
  it("rolls back when the window produced no samples", () => {
    expect(decideRollback([])).toEqual({
      action: "rollback",
      reason: "No health samples in the window.",
    });
  });

  it("holds when health stays up and the error rate was not reported", () => {
    expect(decideRollback([{ healthy: true, errorRate: null }]).action).toBe("hold");
  });

  it("holds at the threshold and rolls back above it", () => {
    expect(decideRollback([{ healthy: true, errorRate: 0.02 }]).action).toBe("hold");
    const degraded = decideRollback([{ healthy: true, errorRate: 0.064 }]);
    expect(degraded.action).toBe("rollback");
    expect(degraded.reason).toContain("0.064");
  });

  it("rolls back when any health check fails", () => {
    const decision = decideRollback([
      { healthy: true, errorRate: 0 },
      { healthy: false, errorRate: 0.01 },
    ]);
    expect(decision.action).toBe("rollback");
    expect(decision.reason).toContain("1 of 2");
  });
});
