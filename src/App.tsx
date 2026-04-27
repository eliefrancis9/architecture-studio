import { ArchitectureCanvas } from "./components/ArchitectureCanvas";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ComponentPalette } from "./components/ComponentPalette";
import { ExportSummaryPanel } from "./components/ExportSummaryPanel";
import { InspectorPanel } from "./components/InspectorPanel";
import { ScenarioComparisonPanel } from "./components/ScenarioComparisonPanel";
import { ScenarioSelector } from "./components/ScenarioSelector";
import "./styles/app.css";

export function App() {
  return (
    <AppErrorBoundary>
      <div className="appShell">
        <ScenarioSelector />
        <div className="workspace">
          <ComponentPalette />
          <div className="centerColumn">
            <ScenarioComparisonPanel />
            <ExportSummaryPanel />
            <ArchitectureCanvas />
          </div>
          <InspectorPanel />
        </div>
      </div>
    </AppErrorBoundary>
  );
}
