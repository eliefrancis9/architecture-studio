import type { ArchitectureScenario, RiskSignal } from "../domain/architecture";

export function evaluateScenario(scenario: ArchitectureScenario): RiskSignal[] {
  const signals: RiskSignal[] = [...scenario.risks];
  const securityComponents = scenario.components.filter((component) => component.type === "security");

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
