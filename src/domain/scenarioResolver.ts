import type {
  Architecture,
  ArchitectureDecision,
  ArchitectureScenario,
  Dependency,
  NetworkBoundary,
  ScenarioOverrides,
} from "./architecture";

type EntityWithId = { id: string };

function applyOverrides<T extends EntityWithId>(baseItems: T[], overrides?: Record<string, Partial<T>>, additions: T[] = []) {
  return [
    ...baseItems.map((item) => ({
      ...item,
      ...(overrides?.[item.id] ?? {}),
    })),
    ...additions,
  ];
}

function applyDecisionOverrides(
  baseItems: ArchitectureDecision[],
  overrides?: Record<string, Partial<ArchitectureDecision>>,
  additions: ArchitectureDecision[] = [],
) {
  return [
    ...baseItems.map((decision) => ({
      ...decision,
      ...(overrides?.[decision.id] ?? {}),
      options: overrides?.[decision.id]?.options ?? decision.options,
    })),
    ...additions,
  ];
}

export function resolveScenario(architecture: Architecture, scenarioId: string): ArchitectureScenario {
  if (scenarioId === architecture.baseScenario.id) {
    return architecture.baseScenario;
  }

  const variant = architecture.variants.find((candidate) => candidate.id === scenarioId);
  if (!variant) {
    return architecture.baseScenario;
  }

  const overrides: ScenarioOverrides = variant.overrides;

  return {
    ...architecture.baseScenario,
    id: variant.id,
    name: variant.name,
    intent: variant.intent,
    constraints: [...architecture.baseScenario.constraints, ...(overrides.constraints ?? [])],
    components: applyOverrides(
      architecture.baseScenario.components,
      overrides.components,
      overrides.componentAdditions ?? [],
    ),
    networks: applyOverrides<NetworkBoundary>(
      architecture.baseScenario.networks,
      overrides.networks,
      overrides.networkAdditions ?? [],
    ),
    dependencies: applyOverrides<Dependency>(
      architecture.baseScenario.dependencies,
      overrides.dependencies,
      overrides.dependencyAdditions ?? [],
    ),
    decisions: applyDecisionOverrides(
      architecture.baseScenario.decisions,
      overrides.decisions,
      overrides.decisionAdditions ?? [],
    ),
    risks: [...architecture.baseScenario.risks, ...(overrides.riskAdditions ?? [])],
  };
}

export function scenarioSummaries(architecture: Architecture) {
  return [
    {
      id: architecture.baseScenario.id,
      name: architecture.baseScenario.name,
      intent: architecture.baseScenario.intent,
    },
    ...architecture.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      intent: variant.intent,
    })),
  ];
}
