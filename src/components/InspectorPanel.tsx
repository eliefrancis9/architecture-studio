import { Braces, GitCompareArrows, SlidersHorizontal, TriangleAlert } from "lucide-react";
import type {
  ArchitectureComponent,
  ArchitectureDecision,
  AvailabilityPattern,
  Criticality,
  Constraint,
  ConstraintPriority,
  ConstraintType,
  DecisionStatus,
  Exposure,
  Provider,
  TradeoffDimension,
} from "../domain/architecture";
import { evaluateConstraints, evaluateScenario } from "../reasoning/signals";
import { useArchitectureStore } from "../state/architectureStore";

const providers: Provider[] = ["aws", "azure", "gcp", "onprem", "saas", "edge"];
const availabilityOptions: AvailabilityPattern[] = ["single", "multi-zone", "multi-region"];
const exposureOptions: Exposure[] = ["private", "internal", "public"];
const criticalityOptions: Criticality[] = ["low", "medium", "high", "mission-critical"];
const decisionStatuses: DecisionStatus[] = ["proposed", "accepted", "superseded"];
const constraintTypes: ConstraintType[] = ["cost", "compliance", "latency", "region", "availability", "security"];
const constraintPriorities: ConstraintPriority[] = ["low", "medium", "high"];

const formatTradeoff = (dimension: TradeoffDimension) => {
  const prefix = dimension.delta > 0 ? "+" : "";
  return `${dimension.sentiment} (${prefix}${dimension.delta} ${dimension.unit})`;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DecisionCard({
  decision,
  onUpdate,
}: {
  decision: ArchitectureDecision;
  onUpdate: (decisionId: string, patch: Partial<ArchitectureDecision>) => void;
}) {
  const selectedOption =
    decision.options.find((option) => option.id === decision.selectedOptionId) ?? decision.options[0];

  return (
    <article className="decisionCard">
      <div className="decisionHeader">
        <strong>{decision.title}</strong>
        <span>{decision.status}</span>
      </div>
      <p>{decision.context}</p>
      <div className="decisionControls">
        <Field label="Option">
          <select
            value={decision.selectedOptionId}
            onChange={(event) => onUpdate(decision.id, { selectedOptionId: event.target.value })}
          >
            {decision.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={decision.status}
            onChange={(event) => onUpdate(decision.id, { status: event.target.value as DecisionStatus })}
          >
            {decisionStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="selectedOption">
        <strong>{selectedOption.title}</strong>
        <span>{selectedOption.description}</span>
      </div>
      <div className="constraintLinks">
        <small>Satisfies: {decision.satisfiesConstraintIds?.length ? decision.satisfiesConstraintIds.join(", ") : "none"}</small>
        <small>Violates: {decision.violatesConstraintIds?.length ? decision.violatesConstraintIds.join(", ") : "none"}</small>
      </div>
      <div className="tradeoffGrid">
        {Object.entries(selectedOption.tradeoffs).map(([dimension, tradeoff]) => (
          <div key={dimension} className={`tradeoff ${tradeoff.sentiment}`}>
            <span>{dimension}</span>
            <strong>{formatTradeoff(tradeoff)}</strong>
            <small>{tradeoff.explanation}</small>
          </div>
        ))}
      </div>
    </article>
  );
}

function ConstraintCard({
  constraint,
  suggestedActions,
  onUpdate,
}: {
  constraint: Constraint;
  suggestedActions: string[];
  onUpdate: (constraintId: string, patch: Partial<Constraint>) => void;
}) {
  return (
    <article className="constraintCard">
      <div className="decisionHeader">
        <strong>{constraint.description}</strong>
        <span>{constraint.priority}</span>
      </div>
      <div className="constraintControls">
        <Field label="Type">
          <select
            value={constraint.type}
            onChange={(event) => onUpdate(constraint.id, { type: event.target.value as ConstraintType })}
          >
            {constraintTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={constraint.priority}
            onChange={(event) => onUpdate(constraint.id, { priority: event.target.value as ConstraintPriority })}
          >
            {constraintPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          value={constraint.description}
          rows={2}
          onChange={(event) => onUpdate(constraint.id, { description: event.target.value })}
        />
      </Field>
      <Field label="Target value">
        <input
          value={String(constraint.targetValue)}
          onChange={(event) => {
            const numericValue = Number(event.target.value);
            onUpdate(constraint.id, {
              targetValue: Number.isFinite(numericValue) && event.target.value.trim() !== "" ? numericValue : event.target.value,
            });
          }}
        />
      </Field>
      {suggestedActions.length > 0 && (
        <div className="suggestedActions">
          <strong>Suggested actions</strong>
          {suggestedActions.map((action) => (
            <small key={action}>{action}</small>
          ))}
        </div>
      )}
    </article>
  );
}

export function InspectorPanel() {
  const scenario = useArchitectureStore((state) => state.activeScenario());
  const component = useArchitectureStore((state) => state.selectedComponent());
  const updateComponent = useArchitectureStore((state) => state.updateComponent);
  const addConstraint = useArchitectureStore((state) => state.addConstraint);
  const updateConstraint = useArchitectureStore((state) => state.updateConstraint);
  const updateDecision = useArchitectureStore((state) => state.updateDecision);
  const addDependency = useArchitectureStore((state) => state.addDependency);
  const signals = evaluateScenario(scenario);
  const constraintEvaluations = evaluateConstraints(scenario);
  const constraintEvaluationById = new Map(
    constraintEvaluations.map((evaluation) => [evaluation.constraint.id, evaluation]),
  );

  const update = <K extends keyof ArchitectureComponent>(key: K, value: ArchitectureComponent[K]) => {
    if (component) {
      updateComponent(component.id, { [key]: value });
    }
  };

  const visibleDecisions = component
    ? scenario.decisions.filter((decision) => decision.linkedComponentIds.includes(component.id))
    : scenario.decisions;
  const visibleDecisionConstraintIds = new Set(
    visibleDecisions.flatMap((decision) => [
      ...(decision.satisfiesConstraintIds ?? []),
      ...(decision.violatesConstraintIds ?? []),
    ]),
  );
  const componentSignals = component
    ? signals.filter(
        (signal) =>
          signal.componentIds.includes(component.id) ||
          signal.constraintIds?.some((constraintId) => visibleDecisionConstraintIds.has(constraintId)),
      )
    : signals.slice(0, 5);

  return (
    <aside className="inspector panel">
      <div className="panelHeader">
        <SlidersHorizontal size={18} />
        <div>
          <h2>Inspector</h2>
          <p>{component ? component.name : scenario.name}</p>
        </div>
      </div>

      {component ? (
        <div className="formStack">
          <Field label="Name">
            <input value={component.name} onChange={(event) => update("name", event.target.value)} />
          </Field>

          <Field label="Role">
            <textarea value={component.role} onChange={(event) => update("role", event.target.value)} rows={3} />
          </Field>

          <div className="fieldGrid">
            <Field label="Provider">
              <select value={component.provider} onChange={(event) => update("provider", event.target.value as Provider)}>
                {providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider.toUpperCase()}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Region">
              <input value={component.region} onChange={(event) => update("region", event.target.value)} />
            </Field>
          </div>

          <Field label="Availability">
            <select
              value={component.availability}
              onChange={(event) => update("availability", event.target.value as AvailabilityPattern)}
            >
              {availabilityOptions.map((availability) => (
                <option key={availability} value={availability}>
                  {availability}
                </option>
              ))}
            </select>
          </Field>

          <div className="fieldGrid">
            <Field label="Exposure">
              <select value={component.exposure} onChange={(event) => update("exposure", event.target.value as Exposure)}>
                {exposureOptions.map((exposure) => (
                  <option key={exposure} value={exposure}>
                    {exposure}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Criticality">
              <select
                value={component.criticality}
                onChange={(event) => update("criticality", event.target.value as Criticality)}
              >
                {criticalityOptions.map((criticality) => (
                  <option key={criticality} value={criticality}>
                    {criticality}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="fieldGrid">
            <Field label="Cost model">
              <select
                value={component.costProfile.model}
                onChange={(event) =>
                  updateComponent(component.id, {
                    costProfile: { ...component.costProfile, model: event.target.value as ArchitectureComponent["costProfile"]["model"] },
                  })
                }
              >
                {["payg", "reserved", "committed", "license", "unknown"].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Monthly cost">
              <input
                type="number"
                min="0"
                value={component.costProfile.monthlyEstimate}
                onChange={(event) =>
                  updateComponent(component.id, {
                    costProfile: { ...component.costProfile, monthlyEstimate: Number(event.target.value) },
                  })
                }
              />
            </Field>
          </div>

          <Field label="Monitoring">
            <select
              value={component.operability.monitoring}
              onChange={(event) =>
                updateComponent(component.id, {
                  operability: {
                    ...component.operability,
                    monitoring: event.target.value as ArchitectureComponent["operability"]["monitoring"],
                  },
                })
              }
            >
              {["none", "basic", "slo-backed"].map((monitoring) => (
                <option key={monitoring} value={monitoring}>
                  {monitoring}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Depends on">
            <select
              value=""
              onChange={(event) => {
                if (event.target.value) {
                  addDependency(component.id, event.target.value);
                }
              }}
            >
              <option value="">Add dependency</option>
              {scenario.components
                .filter((candidate) => candidate.id !== component.id && !component.dependencies.includes(candidate.id))
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
      ) : (
        <div className="emptyState">
          <Braces size={22} />
          <strong>No component selected</strong>
          <span>Select a component on the canvas to edit its schema, dependencies, decisions, and tradeoffs.</span>
          <small>
            {scenario.components.length} components / {scenario.dependencies.length} dependencies /{" "}
            {scenario.decisions.length} decisions
          </small>
        </div>
      )}

      <section className="decisions">
        <div className="sectionTitle">
          <GitCompareArrows size={16} />
          <h3>Decisions & Tradeoffs</h3>
        </div>
        {visibleDecisions.length === 0 ? (
          <p className="quiet">No decisions linked to this selection.</p>
        ) : (
          visibleDecisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} onUpdate={updateDecision} />
          ))
        )}
      </section>

      <section className="constraints">
        <div className="sectionTitle sectionTitleWithAction">
          <div>
            <Braces size={16} />
            <h3>Constraints</h3>
          </div>
          <button onClick={addConstraint}>Add</button>
        </div>
        {scenario.constraints.length === 0 ? (
          <p className="quiet">No constraints captured for this scenario.</p>
        ) : (
          scenario.constraints.map((constraint) => (
            <ConstraintCard
              key={constraint.id}
              constraint={constraint}
              suggestedActions={
                constraintEvaluationById.get(constraint.id)?.satisfied
                  ? []
                  : constraintEvaluationById.get(constraint.id)?.suggestedActions ?? []
              }
              onUpdate={updateConstraint}
            />
          ))
        )}
      </section>

      <section className="signals">
        <div className="sectionTitle">
          <TriangleAlert size={16} />
          <h3>Signals</h3>
        </div>
        {componentSignals.length === 0 ? (
          <p className="quiet">No active signals for this selection.</p>
        ) : (
          componentSignals.map((signal) => (
            <article key={signal.id} className={`signal ${signal.severity}`}>
              <div>
                <strong>{signal.title}</strong>
                <span>{signal.category}</span>
              </div>
              <p>{signal.explanation}</p>
              <small>{signal.tradeoff}</small>
            </article>
          ))
        )}
      </section>

      {component && (
        <section className="jsonPreview">
          <div className="sectionTitle">
            <Braces size={16} />
            <h3>Schema</h3>
          </div>
          <pre>{JSON.stringify({ component, decisions: visibleDecisions }, null, 2)}</pre>
        </section>
      )}
    </aside>
  );
}
