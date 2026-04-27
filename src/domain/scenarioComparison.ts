import type {
  Architecture,
  ArchitectureComponent,
  ArchitectureDecision,
  ArchitectureScenario,
  ConstraintType,
  RiskSignalCategory,
  TradeoffProfile,
} from "./architecture";
import { evaluateConstraints, evaluateScenario } from "../reasoning/signals";
import { resolveScenario } from "./scenarioResolver";

export interface ChangedEntity {
  id: string;
  name: string;
  changes: string[];
}

export interface ScenarioComparison {
  base: ArchitectureScenario;
  active: ArchitectureScenario;
  isVariant: boolean;
  totalMonthlyCost: {
    base: number;
    active: number;
    delta: number;
  };
  signalCountByCategory: Record<RiskSignalCategory, { base: number; active: number; delta: number }>;
  changedComponents: ChangedEntity[];
  changedDecisions: ChangedEntity[];
  constraintSatisfaction: {
    baseSatisfied: number;
    activeSatisfied: number;
    delta: number;
    byType: Record<ConstraintType, { base: number; active: number; delta: number }>;
  };
  keyTradeoffDeltas: Array<{
    decisionId: string;
    decisionTitle: string;
    dimension: keyof TradeoffProfile;
    delta: number;
    unit: TradeoffProfile[keyof TradeoffProfile]["unit"];
  }>;
}

const signalCategories: RiskSignalCategory[] = [
  "resilience",
  "security",
  "scalability",
  "operability",
  "cost",
  "compliance",
];
const constraintTypes: ConstraintType[] = ["cost", "compliance", "latency", "region", "availability", "security"];

function totalMonthlyCost(scenario: ArchitectureScenario) {
  return scenario.components.reduce((sum, component) => sum + component.costProfile.monthlyEstimate, 0);
}

function countSignals(scenario: ArchitectureScenario) {
  const counts: Record<RiskSignalCategory, number> = {
    resilience: 0,
    security: 0,
    scalability: 0,
    operability: 0,
    cost: 0,
    compliance: 0,
  };

  evaluateScenario(scenario).forEach((signal) => {
    counts[signal.category] += 1;
  });

  return counts;
}

function constraintSatisfaction(base: ArchitectureScenario, active: ArchitectureScenario) {
  const baseEvaluations = evaluateConstraints(base);
  const activeEvaluations = evaluateConstraints(active);
  const countSatisfied = (type: ConstraintType, scenario: "base" | "active") => {
    const evaluations = scenario === "base" ? baseEvaluations : activeEvaluations;
    return evaluations.filter((evaluation) => evaluation.constraint.type === type && evaluation.satisfied).length;
  };
  const baseSatisfied = baseEvaluations.filter((evaluation) => evaluation.satisfied).length;
  const activeSatisfied = activeEvaluations.filter((evaluation) => evaluation.satisfied).length;

  return {
    baseSatisfied,
    activeSatisfied,
    delta: activeSatisfied - baseSatisfied,
    byType: constraintTypes.reduce(
      (summary, type) => {
        const baseCount = countSatisfied(type, "base");
        const activeCount = countSatisfied(type, "active");
        return {
          ...summary,
          [type]: {
            base: baseCount,
            active: activeCount,
            delta: activeCount - baseCount,
          },
        };
      },
      {} as ScenarioComparison["constraintSatisfaction"]["byType"],
    ),
  };
}

function changedComponents(base: ArchitectureComponent[], active: ArchitectureComponent[]): ChangedEntity[] {
  const baseById = new Map(base.map((component) => [component.id, component]));

  return active.flatMap((component) => {
    const baseComponent = baseById.get(component.id);
    if (!baseComponent) {
      return [{ id: component.id, name: component.name, changes: ["added"] }];
    }

    const changes = [
      baseComponent.provider !== component.provider ? "provider" : undefined,
      baseComponent.region !== component.region ? "region" : undefined,
      baseComponent.availability !== component.availability ? "availability" : undefined,
      baseComponent.exposure !== component.exposure ? "exposure" : undefined,
      baseComponent.criticality !== component.criticality ? "criticality" : undefined,
      baseComponent.costProfile.monthlyEstimate !== component.costProfile.monthlyEstimate ? "monthly cost" : undefined,
      baseComponent.operability.monitoring !== component.operability.monitoring ? "monitoring" : undefined,
    ].filter((change): change is string => Boolean(change));

    return changes.length > 0 ? [{ id: component.id, name: component.name, changes }] : [];
  });
}

function selectedOption(decision: ArchitectureDecision) {
  return decision.options.find((option) => option.id === decision.selectedOptionId) ?? decision.options[0];
}

function changedDecisions(base: ArchitectureDecision[], active: ArchitectureDecision[]): ChangedEntity[] {
  const baseById = new Map(base.map((decision) => [decision.id, decision]));

  return active.flatMap((decision) => {
    const baseDecision = baseById.get(decision.id);
    if (!baseDecision) {
      return [{ id: decision.id, name: decision.title, changes: ["added"] }];
    }

    const changes = [
      baseDecision.selectedOptionId !== decision.selectedOptionId ? "selected option" : undefined,
      baseDecision.status !== decision.status ? "status" : undefined,
    ].filter((change): change is string => Boolean(change));

    return changes.length > 0 ? [{ id: decision.id, name: decision.title, changes }] : [];
  });
}

function keyTradeoffDeltas(base: ArchitectureDecision[], active: ArchitectureDecision[]) {
  const baseById = new Map(base.map((decision) => [decision.id, decision]));

  return active.flatMap((decision) => {
    const baseDecision = baseById.get(decision.id);
    if (!baseDecision) {
      return [];
    }

    const baseOption = selectedOption(baseDecision);
    const activeOption = selectedOption(decision);

    return (["cost", "risk", "complexity", "operability"] as Array<keyof TradeoffProfile>).flatMap((dimension) => {
      const baseTradeoff = baseOption.tradeoffs[dimension];
      const activeTradeoff = activeOption.tradeoffs[dimension];
      const delta = activeTradeoff.delta - baseTradeoff.delta;

      return delta === 0
        ? []
        : [
            {
              decisionId: decision.id,
              decisionTitle: decision.title,
              dimension,
              delta,
              unit: activeTradeoff.unit,
            },
          ];
    });
  });
}

export function compareBaseToActive(architecture: Architecture): ScenarioComparison {
  const base = architecture.baseScenario;
  const active = resolveScenario(architecture, architecture.activeScenarioId);
  const baseCost = totalMonthlyCost(base);
  const activeCost = totalMonthlyCost(active);
  const baseSignals = countSignals(base);
  const activeSignals = countSignals(active);
  const constraints = constraintSatisfaction(base, active);

  return {
    base,
    active,
    isVariant: active.id !== base.id,
    totalMonthlyCost: {
      base: baseCost,
      active: activeCost,
      delta: activeCost - baseCost,
    },
    signalCountByCategory: signalCategories.reduce(
      (summary, category) => ({
        ...summary,
        [category]: {
          base: baseSignals[category],
          active: activeSignals[category],
          delta: activeSignals[category] - baseSignals[category],
        },
      }),
      {} as ScenarioComparison["signalCountByCategory"],
    ),
    changedComponents: changedComponents(base.components, active.components),
    changedDecisions: changedDecisions(base.decisions, active.decisions),
    constraintSatisfaction: constraints,
    keyTradeoffDeltas: keyTradeoffDeltas(base.decisions, active.decisions),
  };
}
