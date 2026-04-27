import {
  Activity,
  Cloud,
  Database,
  Fingerprint,
  Network,
  Router,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "../domain/architecture";

const paletteItems: Array<{ type: ComponentType; label: string; description: string; icon: typeof Server }> = [
  { type: "compute", label: "Compute", description: "Applications, APIs, workers", icon: Server },
  { type: "network", label: "Network", description: "Boundaries and connectivity", icon: Network },
  { type: "storage", label: "Storage", description: "Databases, object stores", icon: Database },
  { type: "identity", label: "Identity", description: "Users, apps, permissions", icon: Fingerprint },
  { type: "security", label: "Security", description: "Edge controls and policy", icon: ShieldCheck },
  { type: "integration", label: "Integration", description: "Events, APIs, queues", icon: Router },
  { type: "observability", label: "Observability", description: "Telemetry and response", icon: Activity },
];

export function ComponentPalette() {
  return (
    <aside className="palette panel">
      <div className="panelHeader">
        <Cloud size={18} />
        <div>
          <h2>Components</h2>
          <p>Schema-backed building blocks</p>
        </div>
      </div>

      <div className="paletteList">
        {paletteItems.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            className="paletteItem"
            draggable
            onDragStart={(event) => event.dataTransfer.setData("application/component-type", type)}
          >
            <Icon size={18} />
            <span>
              <strong>{label}</strong>
              <small>{description}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
