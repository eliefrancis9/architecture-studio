import { Layers3, RotateCcw } from "lucide-react";
import { ExportSummaryPanel } from "./ExportSummaryPanel";
import { scenarioSummaries } from "../domain/scenarioResolver";
import { useArchitectureStore } from "../state/architectureStore";

export function ScenarioSelector() {
  const architecture = useArchitectureStore((state) => state.architecture);
  const setActiveScenario = useArchitectureStore((state) => state.setActiveScenario);
  const resetDemoData = useArchitectureStore((state) => state.resetDemoData);
  const scenarios = scenarioSummaries(architecture);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brandMark">AS</div>
        <div>
          <h1>Architecture Studio</h1>
          <p>{architecture.name}</p>
        </div>
      </div>

      <div className="topbarActions">
        <div className="scenarioControl" aria-label="Scenario selector">
          <Layers3 size={16} />
          {scenarios.map((scenario) => (
            <button
              key={scenario.id}
              className={scenario.id === architecture.activeScenarioId ? "active" : ""}
              onClick={() => setActiveScenario(scenario.id)}
            >
              {scenario.name}
            </button>
          ))}
        </div>
        <button className="resetButton" onClick={resetDemoData} title="Clear workspace and start blank">
          <RotateCcw size={15} />
          Start Blank
        </button>
        <ExportSummaryPanel />
      </div>
    </header>
  );
}
