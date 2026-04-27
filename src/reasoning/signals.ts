import type {
  ArchitectureComponent,
  ArchitectureScenario,
  Constraint,
  RiskSignal,
  SuggestedAction,
} from "../domain/architecture";

export interface ConstraintEvaluation {
  constraint: Constraint;
  satisfied: boolean;
  actualValue: string | number;
  explanation: string;
  suggestedActions: SuggestedAction[];
}

const availabilityRank: Record<ArchitectureComponent["availability"], number> = {
  single: 1,
  "multi-zone": 2,
  "multi-region": 3,
};

function totalMonthlyCost(scenario: ArchitectureScenario) {
  return scenario.components.reduce((sum, component) => sum + component.costProfile.monthlyEstimate, 0);
}

function categoryForConstraint(type: Constraint["type"]): RiskSignal["category"] {
  if (type === "availability") return "resilience";
  if (type === "latency") return "operability";
  if (type === "region") return "compliance";
  return type;
}

function componentNames(components: ArchitectureComponent[]) {
  return components.map((component) => component.name).join(", ");
}

function highestCostComponent(scenario: ArchitectureScenario) {
  return [...scenario.components].sort(
    (a, b) => b.costProfile.monthlyEstimate - a.costProfile.monthlyEstimate,
  )[0];
}

export function evaluateConstraints(scenario: ArchitectureScenario): ConstraintEvaluation[] {
  return scenario.constraints.map((constraint) => {
    if (constraint.type === "cost") {
      const actualValue = totalMonthlyCost(scenario);
      const targetValue = Number(constraint.targetValue);

      return {
        constraint,
        actualValue,
        satisfied: Number.isFinite(targetValue) ? actualValue <= targetValue : true,
        explanation: `Modeled monthly cost is $${actualValue.toLocaleString()} against a target of $${targetValue.toLocaleString()}.`,
        suggestedActions:
          actualValue > targetValue
            ? [
                highestCostComponent(scenario)
                  ? {
                      description: `${highestCostComponent(scenario).name} can move to reserved pricing and a lower modeled monthly estimate.`,
                      targetComponentId: highestCostComponent(scenario).id,
                      patch: {
                        costProfile: {
                          ...highestCostComponent(scenario).costProfile,
                          model: "reserved",
                          monthlyEstimate: Math.round(highestCostComponent(scenario).costProfile.monthlyEstimate * 0.8),
                        },
                      },
                    }
                  : {
                      description:
                        "Review the highest-cost components and reduce capacity assumptions where resilience requirements allow.",
                    },
                {
                  description:
                    "Create a cost-focused variant that removes non-critical redundancy before customer review.",
                },
              ]
            : [],
      };
    }

    if (constraint.type === "region") {
      const targetValue = String(constraint.targetValue);
      const violatingComponents = scenario.components.filter((component) => !component.region.includes(targetValue));

      return {
        constraint,
        actualValue: violatingComponents.length === 0 ? targetValue : `${violatingComponents.length} out-of-region components`,
        satisfied: violatingComponents.length === 0,
        explanation:
          violatingComponents.length === 0
            ? `All modeled components align to ${targetValue}.`
            : `${violatingComponents.length} components are outside or not explicitly aligned to ${targetValue}.`,
        suggestedActions:
          violatingComponents.length === 0
            ? []
            : [
                ...violatingComponents.map((component) => ({
                  description: `${component.name} should move to ${targetValue} or document an approved exception.`,
                  targetComponentId: component.id,
                  patch: { region: targetValue },
                })),
                {
                  description: `Update dependent network boundaries for ${componentNames(
                    violatingComponents,
                  )} so placement and traffic flow stay aligned.`,
                },
              ],
      };
    }

    if (constraint.type === "availability") {
      const targetText = String(constraint.targetValue);
      const targetRank = availabilityRank[targetText as ArchitectureComponent["availability"]];

      if (targetRank) {
        const violatingComponents = scenario.components.filter(
          (component) => component.criticality !== "low" && availabilityRank[component.availability] < targetRank,
        );

        return {
          constraint,
          actualValue: violatingComponents.length === 0 ? targetText : `${violatingComponents.length} below target`,
          satisfied: violatingComponents.length === 0,
          explanation:
            violatingComponents.length === 0
              ? `Non-low criticality components meet ${targetText} availability.`
              : `${violatingComponents.length} non-low criticality components are below ${targetText} availability.`,
          suggestedActions:
            violatingComponents.length === 0
              ? []
              : violatingComponents.map((component) => ({
                  description: `${component.name} should move from ${component.availability} to ${targetText}.`,
                  targetComponentId: component.id,
                  patch: { availability: targetText as ArchitectureComponent["availability"] },
                })),
        };
      }

      const targetHours = Number(constraint.targetValue);
      const violatingComponents = scenario.components.filter((component) => {
        const rto = component.operability.recoveryObjectiveHours;
        return component.criticality !== "low" && (rto === undefined || rto > targetHours);
      });

      return {
        constraint,
        actualValue: violatingComponents.length === 0 ? targetHours : `${violatingComponents.length} RTO gaps`,
        satisfied: Number.isFinite(targetHours) ? violatingComponents.length === 0 : true,
        explanation:
          violatingComponents.length === 0
            ? `Recovery objectives meet the ${targetHours} hour target.`
            : `${violatingComponents.length} non-low criticality components exceed or omit the ${targetHours} hour RTO target.`,
        suggestedActions:
          violatingComponents.length === 0
            ? []
            : violatingComponents.map((component) => ({
                description: `${component.name} should define an RTO at or below ${targetHours} hour${
                  targetHours === 1 ? "" : "s"
                } and add monitoring/runbook coverage.`,
                targetComponentId: component.id,
                patch: {
                  operability: {
                    ...component.operability,
                    monitoring: component.operability.monitoring === "none" ? "basic" : component.operability.monitoring,
                    recoveryObjectiveHours: targetHours,
                  },
                },
              })),
      };
    }

    if (constraint.type === "security") {
      const requiresSecurityLayer = String(constraint.targetValue).toLowerCase().includes("security");
      const hasPublicSurface = scenario.components.some((component) => component.exposure === "public");
      const hasSecurityLayer = scenario.components.some((component) => component.type === "security");

      return {
        constraint,
        actualValue: hasSecurityLayer ? "security layer modeled" : "no security layer",
        satisfied: !requiresSecurityLayer || !hasPublicSurface || hasSecurityLayer,
        explanation:
          hasPublicSurface && !hasSecurityLayer
            ? "Public exposure exists without an explicit security component."
            : "Security constraint is satisfied by the current exposure and control model.",
        suggestedActions:
          hasPublicSurface && !hasSecurityLayer
            ? [
                {
                  description: "Add a security layer component in front of public surfaces.",
                },
                ...scenario.components
                  .filter((component) => component.exposure === "public")
                  .map((component) => ({
                    description: `${component.name} can move behind an internal exposure boundary if direct access is not required.`,
                    targetComponentId: component.id,
                    patch: { exposure: "internal" as ArchitectureComponent["exposure"] },
                  })),
              ]
            : [],
      };
    }

    const satisfyingDecision = scenario.decisions.find((decision) =>
      decision.satisfiesConstraintIds?.includes(constraint.id),
    );
    const acceptedDecisionSatisfies = scenario.decisions.some(
      (decision) => decision.status === "accepted" && decision.satisfiesConstraintIds?.includes(constraint.id),
    );

    return {
      constraint,
      actualValue: acceptedDecisionSatisfies ? "accepted decision coverage" : "not evidenced",
      satisfied: acceptedDecisionSatisfies,
      explanation: acceptedDecisionSatisfies
        ? "An accepted decision explicitly satisfies this constraint."
        : "No accepted decision currently evidences this constraint.",
      suggestedActions: acceptedDecisionSatisfies
        ? []
        : [
            satisfyingDecision
              ? {
                  description: `Accept ${satisfyingDecision.title} if it is the intended way to satisfy this ${constraint.type} constraint.`,
                  targetDecisionId: satisfyingDecision.id,
                  patch: { status: "accepted" },
                }
              : {
                  description: `Link this ${constraint.type} constraint to a decision and mark the satisfying option as accepted.`,
                },
            {
              description: "Capture an explicit exception if the constraint is intentionally deferred.",
            },
          ],
    };
  });
}

export function evaluateScenario(scenario: ArchitectureScenario): RiskSignal[] {
  const signals: RiskSignal[] = [...scenario.risks];
  const securityComponents = scenario.components.filter((component) => component.type === "security");

  evaluateConstraints(scenario)
    .filter((evaluation) => !evaluation.satisfied)
    .forEach((evaluation) => {
      signals.push({
        id: `constraint-${evaluation.constraint.id}`,
        scenarioId: scenario.id,
        category: categoryForConstraint(evaluation.constraint.type),
        severity: evaluation.constraint.priority === "high" ? "warning" : "attention",
        title: `${evaluation.constraint.type} constraint is not satisfied`,
        explanation: evaluation.explanation,
        tradeoff: evaluation.constraint.description,
        componentIds: [],
        constraintIds: [evaluation.constraint.id],
      });
    });

  scenario.components.forEach((component) => {
    if (component.criticality === "mission-critical" && component.availability === "single") {
      signals.push({
        id: `resilience-${component.id}`,
        scenarioId: scenario.id,
        category: "resilience",
        severity: "warning",
        title: "Mission-critical workload is single-zone",
        explanation: `${component.name} is marked mission-critical but uses a single availability pattern.`,
        tradeoff: "Keeping this simple lowers platform cost and delivery effort, but increases recovery risk during infrastructure faults.",
        componentIds: [component.id],
      });
    }

    if (component.exposure === "public" && component.type !== "security" && securityComponents.length === 0) {
      signals.push({
        id: `security-${component.id}`,
        scenarioId: scenario.id,
        category: "security",
        severity: "attention",
        title: "Public surface has no explicit security layer",
        explanation: `${component.name} is publicly exposed and the scenario does not include a security component.`,
        tradeoff: "Direct exposure can reduce latency and complexity, but shifts more protection responsibility into the workload itself.",
        componentIds: [component.id],
      });
    }

    if (component.operability.monitoring === "none" && component.criticality !== "low") {
      signals.push({
        id: `operability-${component.id}`,
        scenarioId: scenario.id,
        category: "operability",
        severity: "info",
        title: "Operability ownership is still thin",
        explanation: `${component.name} has no monitoring profile despite non-low criticality.`,
        tradeoff: "Deferring observability can speed early design, but incident response assumptions remain harder to defend.",
        componentIds: [component.id],
      });
    }
  });

  scenario.networks
    .filter((network) => network.segmentation === "flat")
    .forEach((network) => {
      const componentIds = scenario.components
        .filter((component) => component.networkId === network.id)
        .map((component) => component.id);

      signals.push({
        id: `network-${network.id}`,
        scenarioId: scenario.id,
        category: "scalability",
        severity: "info",
        title: "Flat network simplifies delivery",
        explanation: `${network.name} is modeled as flat segmentation.`,
        tradeoff: "A flat network is easier to operate initially, but may limit isolation options as teams and workloads grow.",
        componentIds,
      });
    });

  return signals;
}
