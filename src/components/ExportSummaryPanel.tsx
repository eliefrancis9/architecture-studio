import { Clipboard, Download, FileText, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ArchitectureSummary } from "../domain/architectureSummary";
import { generateArchitectureSummary } from "../domain/architectureSummary";
import { useArchitectureStore } from "../state/architectureStore";

function formatSummaryText(summary: ArchitectureSummary) {
  const lines = [
    `${summary.overview.name} - ${summary.overview.scenarioName}`,
    "",
    `Intent: ${summary.overview.scenarioIntent}`,
    `Context: ${summary.overview.customerContext}`,
    "",
    "Key components:",
    ...summary.keyComponents.map(
      (component) =>
        `- ${component.name}: ${component.role} (${component.provider}, ${component.region}, ${component.availability})`,
    ),
    "",
    "Key decisions:",
    ...summary.keyDecisions.map(
      (decision) => `- ${decision.title}: ${decision.selectedOption} [${decision.status}]`,
    ),
    "",
    "Constraints:",
    ...summary.constraints.map(
      (constraint) =>
        `- ${constraint.satisfied ? "Satisfied" : "Violated"}: ${constraint.description} (${constraint.explanation})`,
    ),
    "",
    "Risks and signals:",
    ...summary.risksAndSignals.map(
      (signal) => `- ${signal.title} [${signal.severity}/${signal.category}]: ${signal.explanation}`,
    ),
    "",
    "Key tradeoffs:",
    ...summary.keyTradeoffs.map(
      (tradeoff) =>
        `- ${tradeoff.decisionTitle} / ${tradeoff.dimension}: ${tradeoff.sentiment} ${tradeoff.delta} ${tradeoff.unit}. ${tradeoff.explanation}`,
    ),
  ];

  return lines.join("\n");
}

export function ExportSummaryPanel() {
  const architecture = useArchitectureStore((state) => state.architecture);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [isOpen, setIsOpen] = useState(false);
  const summary = useMemo(
    () => generateArchitectureSummary(architecture, architecture.activeScenarioId),
    [architecture],
  );
  const formattedSummary = useMemo(() => formatSummaryText(summary), [summary]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formattedSummary);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${summary.overview.name.toLowerCase().replace(/\W+/g, "-")}-${summary.overview.scenarioName
      .toLowerCase()
      .replace(/\W+/g, "-")}-summary.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button className="exportButton" onClick={() => setIsOpen(true)}>
        <FileText size={15} />
        Export
      </button>

      {isOpen && (
        <div className="modalBackdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            className="exportModal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-summary-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="exportHeader">
              <div className="sectionTitle">
                <FileText size={16} />
                <h2 id="export-summary-title">Export / Summary</h2>
              </div>
              <button className="iconButton" onClick={() => setIsOpen(false)} aria-label="Close export summary">
                <X size={16} />
              </button>
            </div>

            <div className="summaryPreview">
              <div>
                <strong>{summary.overview.scenarioName}</strong>
                <span>{summary.overview.scenarioIntent}</span>
              </div>
              <div className="summaryStats">
                <small>{summary.keyComponents.length} components</small>
                <small>{summary.keyDecisions.length} decisions</small>
                <small>{summary.constraints.filter((constraint) => !constraint.satisfied).length} constraint gaps</small>
                <small>{summary.risksAndSignals.length} signals</small>
              </div>
            </div>

            <div className="summarySections">
              <article>
                <h3>Key Decisions</h3>
                {summary.keyDecisions.map((decision) => (
                  <p key={decision.title}>
                    <strong>{decision.title}</strong>
                    <span>{decision.selectedOption}</span>
                  </p>
                ))}
              </article>
              <article>
                <h3>Constraints</h3>
                {summary.constraints.slice(0, 4).map((constraint) => (
                  <p key={constraint.description}>
                    <strong>{constraint.satisfied ? "Satisfied" : "Violated"}</strong>
                    <span>{constraint.description}</span>
                  </p>
                ))}
              </article>
            </div>

            <div className="exportActions">
              <button onClick={copyToClipboard}>
                <Clipboard size={14} />
                {copyState === "copied" ? "Copied" : "Copy formatted text"}
              </button>
              <button onClick={downloadJson}>
                <Download size={14} />
                Download JSON
              </button>
            </div>
            {copyState === "failed" && <p className="quiet">Clipboard access is unavailable in this browser context.</p>}
          </section>
        </div>
      )}
    </>
  );
}
