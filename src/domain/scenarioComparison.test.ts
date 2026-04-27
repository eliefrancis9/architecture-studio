import { describe, expect, it } from "vitest";
import type { Architecture, ArchitectureScenario } from "./architecture";
import { compareBaseToActive } from "./scenarioComparison";

const component = {
  id: "component-api",
  name: "Commerce API",
  type: "compute",
  provider: "aws",
  role: "Customer API",
  region: "us-east-1",
  availability: "single",
  exposure: "internal",
  criticality: "mission-critical",
  tags: [],
  dependencies: [],
  costProfile: {
    model: "payg",
    monthlyEstimate: 1000,
    currency: "USD",
    confidence: "medium",
  },
  operability: {
    owner: "Platform",
    monitoring: "basic",
    recoveryObjectiveHours: 4,
  },
  position: { x: 0, y: 0 },
} satisfies ArchitectureScenario["components"][number];

const baseScenario: ArchitectureScenario = {
  id: "base",
  name: "Base",
  intent: "Reference",
  constraints: [
    {
      id: "constraint-availability",
      type: "availability",
      description: "Require multi-zone",
      targetValue: "multi-zone",
      priority: "high",
    },
  ],
  components: [component],
  networks: [],
  dependencies: [],
  decisions: [],
  risks: [],
};

function architecture(): Architecture {
  return {
    id: "architecture-test",
    name: "Test Architecture",
    description: "Comparison fixture",
    customerContext: "Unit test",
    constraints: [
      {
        id: "constraint-cost",
        type: "cost",
        description: "Cost ceiling",
        targetValue: 1500,
        priority: "medium",
      },
    ],
    baseScenario,
    activeScenarioId: "variant-resilient",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    variants: [
      {
        id: "variant-resilient",
        name: "Resilient",
        intent: "Improve availability",
        baseScenarioId: "base",
        overrides: {
          components: {
            "component-api": {
              availability: "multi-zone",
            },
          },
        },
      },
    ],
  };
}

describe("compareBaseToActive constraint satisfaction", () => {
  it("reports satisfaction deltas between base and active variant", () => {
    const comparison = compareBaseToActive(architecture());

    expect(comparison.constraintSatisfaction.baseSatisfied).toBe(1);
    expect(comparison.constraintSatisfaction.activeSatisfied).toBe(2);
    expect(comparison.constraintSatisfaction.delta).toBe(1);
    expect(comparison.constraintSatisfaction.byType.availability).toEqual({
      base: 0,
      active: 1,
      delta: 1,
    });
    expect(comparison.constraintSatisfaction.byType.cost).toEqual({
      base: 1,
      active: 1,
      delta: 0,
    });
  });
});
