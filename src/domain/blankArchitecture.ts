import type { Architecture } from "./architecture";

export const blankArchitecture: Architecture = {
  id: "arch-blank",
  name: "Untitled Architecture",
  description: "Blank architecture workspace.",
  customerContext: "Define customer context, constraints, components, and decisions.",
  constraints: [],
  activeScenarioId: "base",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  baseScenario: {
    id: "base",
    name: "Base",
    intent: "Define the starting architecture.",
    constraints: [],
    networks: [],
    components: [],
    dependencies: [],
    decisions: [],
    risks: [],
  },
  variants: [
    {
      id: "variant-a",
      name: "Variant A",
      intent: "Explore an alternate tradeoff posture.",
      baseScenarioId: "base",
      overrides: {},
    },
    {
      id: "variant-b",
      name: "Variant B",
      intent: "Explore another architecture option.",
      baseScenarioId: "base",
      overrides: {},
    },
  ],
};
