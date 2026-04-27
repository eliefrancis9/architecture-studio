import { describe, expect, it } from "vitest";
import type { ArchitectureScenario } from "../domain/architecture";
import { evaluateConstraints } from "./signals";

const baseComponent = {
  id: "component-api",
  name: "Commerce API",
  type: "compute",
  provider: "aws",
  role: "Customer API",
  region: "us-west-2",
  availability: "single",
  exposure: "public",
  criticality: "mission-critical",
  tags: [],
  dependencies: [],
  costProfile: {
    model: "payg",
    monthlyEstimate: 2400,
    currency: "USD",
    confidence: "medium",
  },
  operability: {
    owner: "Platform",
    monitoring: "none",
    recoveryObjectiveHours: 4,
  },
  position: { x: 0, y: 0 },
} satisfies ArchitectureScenario["components"][number];

function scenario(overrides: Partial<ArchitectureScenario> = {}): ArchitectureScenario {
  return {
    id: "scenario-test",
    name: "Test",
    intent: "Verify deterministic constraint guidance.",
    constraints: [],
    components: [baseComponent],
    networks: [],
    dependencies: [],
    decisions: [],
    risks: [],
    ...overrides,
  };
}

describe("evaluateConstraints suggested actions", () => {
  it("creates an availability patch for components below the target", () => {
    const [evaluation] = evaluateConstraints(
      scenario({
        constraints: [
          {
            id: "constraint-availability",
            type: "availability",
            description: "Require zonal resilience",
            targetValue: "multi-zone",
            priority: "high",
          },
        ],
      }),
    );

    expect(evaluation.satisfied).toBe(false);
    expect(evaluation.suggestedActions[0]).toMatchObject({
      targetComponentId: "component-api",
      patch: { availability: "multi-zone" },
    });
  });

  it("creates a region patch for out-of-region components", () => {
    const [evaluation] = evaluateConstraints(
      scenario({
        constraints: [
          {
            id: "constraint-region",
            type: "region",
            description: "Require approved region",
            targetValue: "us-east-1",
            priority: "medium",
          },
        ],
      }),
    );

    expect(evaluation.satisfied).toBe(false);
    expect(evaluation.suggestedActions[0]).toMatchObject({
      targetComponentId: "component-api",
      patch: { region: "us-east-1" },
    });
  });

  it("creates a decision status patch when a linked satisfying decision is not accepted", () => {
    const [evaluation] = evaluateConstraints(
      scenario({
        constraints: [
          {
            id: "constraint-compliance",
            type: "compliance",
            description: "Decision evidence required",
            targetValue: "accepted decision",
            priority: "high",
          },
        ],
        decisions: [
          {
            id: "decision-control",
            title: "Control posture",
            status: "proposed",
            context: "Compliance control decision.",
            selectedOptionId: "option-control",
            options: [
              {
                id: "option-control",
                title: "Adopt control",
                description: "Use explicit control coverage.",
                tradeoffs: {
                  cost: { sentiment: "neutral", delta: 0, unit: "usd-monthly", explanation: "" },
                  risk: { sentiment: "improves", delta: -1, unit: "risk-score", explanation: "" },
                  complexity: { sentiment: "neutral", delta: 0, unit: "complexity-points", explanation: "" },
                  operability: { sentiment: "neutral", delta: 0, unit: "operability-score", explanation: "" },
                },
              },
            ],
            linkedComponentIds: [],
            linkedDependencyIds: [],
            linkedNetworkIds: [],
            linkedRiskIds: [],
            satisfiesConstraintIds: ["constraint-compliance"],
          },
        ],
      }),
    );

    expect(evaluation.satisfied).toBe(false);
    expect(evaluation.suggestedActions[0]).toMatchObject({
      targetDecisionId: "decision-control",
      patch: { status: "accepted" },
    });
  });

  it("returns no suggested actions for satisfied constraints", () => {
    const [evaluation] = evaluateConstraints(
      scenario({
        constraints: [
          {
            id: "constraint-region",
            type: "region",
            description: "Require current region",
            targetValue: "us-west-2",
            priority: "medium",
          },
        ],
      }),
    );

    expect(evaluation.satisfied).toBe(true);
    expect(evaluation.suggestedActions).toEqual([]);
  });
});
