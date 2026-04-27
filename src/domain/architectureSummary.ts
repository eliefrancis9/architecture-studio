import type { Architecture, TradeoffProfile } from "./architecture";
import { evaluateConstraints, evaluateScenario } from "../reasoning/signals";
import { resolveScenario } from "./scenarioResolver";

export interface ArchitectureSummary {
  overview: {
    name: string;
    scenarioName: string;
    scenarioIntent: string;
    customerContext: string;
  };
  keyComponents: Array<{
    name: string;
    role: string;
    provider: string;
    region: string;
    availability: string;
  }>;
  keyDecisions: Array<{
    title: string;
    status: string;
    selectedOption: string;
    tradeoffs: TradeoffProfile;
  }>;
  constraints: Array<{
    description: string;
    type: string;
    priority: string;
    targetValue: string | number;
    satisfied: boolean;
    actualValue: string | number;
    explanation: string;
  }>;
  risksAndSignals: Array<{
    title: string;
    severity: string;
    category: string;
    explanation: string;
  }>;
  keyTradeoffs: Array<{
    decisionTitle: string;
    dimension: keyof TradeoffProfile;
    sentiment: string;
    delta: number;
    unit: string;
    explanation: string;
  }>;
}

export function generateArchitectureSummary(architecture: Architecture, scenarioId: string): ArchitectureSummary {
  const scenario = resolveScenario(architecture, scenarioId);
  const constraintEvaluations = evaluateConstraints(scenario);
  const signals = evaluateScenario(scenario);

  const keyDecisions = scenario.decisions.map((decision) => {
    const selectedOption =
      decision.options.find((option) => option.id === decision.selectedOptionId) ?? decision.options[0];

    return {
      title: decision.title,
      status: decision.status,
      selectedOption: selectedOption.title,
      tradeoffs: selectedOption.tradeoffs,
    };
  });

  return {
    overview: {
      name: architecture.name,
      scenarioName: scenario.name,
      scenarioIntent: scenario.intent,
      customerContext: architecture.customerContext,
    },
    keyComponents: scenario.components.map((component) => ({
      name: component.name,
      role: component.role,
      provider: component.provider,
      region: component.region,
      availability: component.availability,
    })),
    keyDecisions,
    constraints: constraintEvaluations.map((evaluation) => ({
      description: evaluation.constraint.description,
      type: evaluation.constraint.type,
      priority: evaluation.constraint.priority,
      targetValue: evaluation.constraint.targetValue,
      satisfied: evaluation.satisfied,
      actualValue: evaluation.actualValue,
      explanation: evaluation.explanation,
    })),
    risksAndSignals: signals.map((signal) => ({
      title: signal.title,
      severity: signal.severity,
      category: signal.category,
      explanation: signal.explanation,
    })),
    keyTradeoffs: keyDecisions.flatMap((decision) =>
      (Object.entries(decision.tradeoffs) as Array<[keyof TradeoffProfile, TradeoffProfile[keyof TradeoffProfile]]>).map(
        ([dimension, tradeoff]) => ({
          decisionTitle: decision.title,
          dimension,
          sentiment: tradeoff.sentiment,
          delta: tradeoff.delta,
          unit: tradeoff.unit,
          explanation: tradeoff.explanation,
        }),
      ),
    ),
  };
}
