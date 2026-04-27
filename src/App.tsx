import { ArchitectureCanvas } from "./components/ArchitectureCanvas";
import { ComponentPalette } from "./components/ComponentPalette";
import { InspectorPanel } from "./components/InspectorPanel";
import { ScenarioSelector } from "./components/ScenarioSelector";
import "./styles/app.css";

export function App() {
  return (
    <div className="appShell">
      <ScenarioSelector />
      <div className="workspace">
        <ComponentPalette />
        <ArchitectureCanvas />
        <InspectorPanel />
      </div>
    </div>
  );
}
