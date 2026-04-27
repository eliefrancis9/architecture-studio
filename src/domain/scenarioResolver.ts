import type {
  Architecture,
  ArchitectureDecision,
  ArchitectureScenario,
  Constraint,
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

function applyOverridesWithRemovals<T extends EntityWithId>(
  baseItems: T[],
  overrides?: Record<string, Partial<T>>,
  additions: T[] = [],
  removals: string[] = [],
) {
  const removedIds = new Set(removals);

  return applyOverrides(baseItems, overrides, additions).filter((item) => !removedIds.has(item.id));
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

function mergeConstraints(...constraintSets: Array<Constraint[] | undefined>) {
  const constraintsById = new Map<string, Constraint>();

  constraintSets.forEach((constraintSet) => {
    constraintSet?.forEach((constraint) => {
      constraintsById.set(constraint.id, constraint);
    });
  });

  return Array.from(constraintsById.values());
}

export function resolveScenario(architecture: Architecture, scenarioId: string): ArchitectureScenario {
  if (scenarioId === architecture.baseScenario.id) {
    return {
      ...architecture.baseScenario,
      constraints: mergeConstraints(architecture.constraints, architecture.baseScenario.constraints),
    };
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
    constraints: mergeConstraints(architecture.constraints, architecture.baseScenario.constraints, overrides.constraints),
    components: applyOverridesWithRemovals(
      architecture.baseScenario.components,
      overrides.components,
      overrides.componentAdditions ?? [],
      overrides.componentRemovals ?? [],
    ),
    networks: applyOverrides<NetworkBoundary>(
      architecture.baseScenario.networks,
      overrides.networks,
      overrides.networkAdditions ?? [],
    ),
    dependencies: applyOverridesWithRemovals<Dependency>(
      architecture.baseScenario.dependencies,
      overrides.dependencies,
      overrides.dependencyAdditions ?? [],
      overrides.dependencyRemovals ?? [],
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
