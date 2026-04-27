import { ArrowRightLeft, CircleDollarSign, GitCompareArrows, Signal } from "lucide-react";
import type { RiskSignalCategory } from "../domain/architecture";
import { compareBaseToActive } from "../domain/scenarioComparison";
import { useArchitectureStore } from "../state/architectureStore";

const categories: RiskSignalCategory[] = ["resilience", "security", "scalability", "operability", "cost"];

const formatDelta = (delta: number, prefix = "") => {
  if (delta === 0) return `${prefix}0`;
  return `${delta > 0 ? "+" : "-"}${prefix}${Math.abs(delta).toLocaleString()}`;
};

const describeImpact = (comparison: ReturnType<typeof compareBaseToActive>) => {
  if (!comparison.isVariant) {
    return "Base is selected, so this panel is showing the reference architecture with no variant deltas.";
  }

  const costDelta = comparison.totalMonthlyCost.delta;
  const changedDecisionCount = comparison.changedDecisions.length;
  const changedComponentCount = comparison.changedComponents.length;

  if (costDelta > 0 && changedDecisionCount > 0) {
    return `${comparison.active.name} raises monthly cost to buy down risk or improve operability through explicit decisions.`;
  }

  if (costDelta < 0 && changedDecisionCount > 0) {
    return `${comparison.active.name} reduces monthly cost, with tradeoffs captured in changed decisions.`;
  }

  if (changedComponentCount > 0) {
    return `${comparison.active.name} changes component assumptions while keeping decisions stable.`;
  }

  return `${comparison.active.name} currently matches Base on modeled components, decisions, and tradeoffs.`;
};

export function ScenarioComparisonPanel() {
  const architecture = useArchitectureStore((state) => state.architecture);
  const comparison = compareBaseToActive(architecture);
  const impactSummary = describeImpact(comparison);

  return (
    <section className="comparisonPanel panel">
      <div className="comparisonHeader">
        <div className="sectionTitle">
          <ArrowRightLeft size={16} />
          <h2>Base vs Active</h2>
        </div>
        <span>{comparison.isVariant ? comparison.active.name : "Base selected"}</span>
      </div>
      <p className="comparisonNarrative">{impactSummary}</p>

      <div className="comparisonGrid">
        <div className="comparisonMetric">
          <span>
            <CircleDollarSign size={14} /> Monthly cost
          </span>
          <strong>${comparison.totalMonthlyCost.active.toLocaleString()}</strong>
          <small>{formatDelta(comparison.totalMonthlyCost.delta, "$")} vs base</small>
        </div>

        <div className="comparisonMetric signalMatrix">
          <span>
            <Signal size={14} /> Signals
          </span>
          <div>
            {categories.map((category) => {
              const counts = comparison.signalCountByCategory[category];
              return (
                <small key={category}>
                  {category}: {counts.active} ({formatDelta(counts.delta)})
                </small>
              );
            })}
          </div>
        </div>

        <div className="comparisonList">
          <span>
            <GitCompareArrows size={14} /> Changed components
          </span>
          {comparison.changedComponents.length === 0 ? (
            <small>No component assumptions changed.</small>
          ) : (
            comparison.changedComponents.slice(0, 3).map((component) => (
              <small key={component.id}>
                {component.name}: {component.changes.join(", ")} changed
              </small>
            ))
          )}
        </div>

        <div className="comparisonList">
          <span>Changed decisions</span>
          {comparison.changedDecisions.length === 0 ? (
            <small>No decision posture changed.</small>
          ) : (
            comparison.changedDecisions.slice(0, 3).map((decision) => (
              <small key={decision.id}>
                {decision.name}: {decision.changes.join(", ")} changed
              </small>
            ))
          )}
        </div>
      </div>

      <div className="tradeoffDeltaRow">
        {comparison.keyTradeoffDeltas.length === 0 ? (
          <small>No tradeoff deltas from Base. This variant has not changed modeled consequences yet.</small>
        ) : (
          comparison.keyTradeoffDeltas.slice(0, 4).map((tradeoff) => (
            <small key={`${tradeoff.decisionId}-${tradeoff.dimension}`}>
              {tradeoff.dimension}: {formatDelta(tradeoff.delta)} {tradeoff.unit}
            </small>
          ))
        )}
      </div>
    </section>
  );
}
