import { CircleDollarSign, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Group, Layer, Rect, Stage, Text } from "react-konva";
import type { ComponentType } from "../domain/architecture";
import { resolveScenario } from "../domain/scenarioResolver";
import { evaluateScenario } from "../reasoning/signals";
import { useArchitectureStore } from "../state/architectureStore";

const componentColors: Record<ComponentType, { fill: string; stroke: string }> = {
  compute: { fill: "#e9f2ff", stroke: "#3574d4" },
  network: { fill: "#ecfdf3", stroke: "#2d9a57" },
  storage: { fill: "#fff5db", stroke: "#c98212" },
  identity: { fill: "#f1ecff", stroke: "#7b5bd6" },
  security: { fill: "#ffeceb", stroke: "#d84f45" },
  integration: { fill: "#e8fbfa", stroke: "#198f88" },
  observability: { fill: "#f4f4f5", stroke: "#737373" },
};

const cardWidth = 180;
const cardHeight = 84;

export function ArchitectureCanvas() {
  const canvasRef = useRef<HTMLElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 620 });
  const architecture = useArchitectureStore((state) => state.architecture);
  const selectedComponentId = useArchitectureStore((state) => state.selectedComponentId);
  const selectComponent = useArchitectureStore((state) => state.selectComponent);
  const addComponent = useArchitectureStore((state) => state.addComponent);
  const moveComponent = useArchitectureStore((state) => state.moveComponent);
  const scenario = useMemo(
    () => resolveScenario(architecture, architecture.activeScenarioId),
    [architecture],
  );
  const signals = useMemo(() => evaluateScenario(scenario), [scenario]);
  const totalCost = useMemo(
    () => scenario.components.reduce((sum, component) => sum + component.costProfile.monthlyEstimate, 0),
    [scenario.components],
  );

  const componentById = useMemo(
    () => new Map(scenario.components.map((component) => [component.id, component])),
    [scenario.components],
  );

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize({
        width: Math.max(480, Math.floor(width)),
        height: Math.max(460, Math.floor(height)),
      });
    });

    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <main
      ref={canvasRef}
      className="canvasShell"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("application/component-type") as ComponentType;
        if (!type) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        addComponent(type, {
          x: event.clientX - bounds.left - cardWidth / 2,
          y: event.clientY - bounds.top - cardHeight / 2,
        });
      }}
    >
      <div className="canvasToolbar">
        <div>
          <h2>{scenario.name}</h2>
          <p>{scenario.intent}</p>
        </div>
        <div className="metrics">
          <span>
            <CircleDollarSign size={15} /> ${totalCost.toLocaleString()}/mo
          </span>
          <span>
            <ShieldAlert size={15} /> {signals.length} signals
          </span>
        </div>
      </div>

      <Stage
        width={canvasSize.width}
        height={canvasSize.height}
        className="stage"
        onMouseDown={() => selectComponent(undefined)}
      >
        <Layer>
          {scenario.networks.map((network, index) => (
            <Group key={network.id} x={96 + index * 40} y={96 + index * 34}>
              <Rect
                width={880}
                height={520}
                cornerRadius={18}
                fill="rgba(255,255,255,0.42)"
                stroke="#d4dce8"
                dash={[8, 8]}
              />
              <Text x={18} y={16} text={network.name} fontSize={14} fill="#64748b" fontStyle="600" />
            </Group>
          ))}

          {scenario.dependencies.map((dependency) => {
            const from = componentById.get(dependency.fromComponentId);
            const to = componentById.get(dependency.toComponentId);
            if (!from || !to) return null;

            return (
              <Arrow
                key={dependency.id}
                points={[
                  from.position.x + cardWidth,
                  from.position.y + cardHeight / 2,
                  to.position.x,
                  to.position.y + cardHeight / 2,
                ]}
                pointerLength={8}
                pointerWidth={8}
                stroke="#8492a6"
                fill="#8492a6"
                strokeWidth={2}
              />
            );
          })}

          {scenario.components.map((component) => {
            const color = componentColors[component.type];
            const isSelected = component.id === selectedComponentId;
            const componentSignals = signals.filter((signal) => signal.componentIds.includes(component.id));

            return (
              <Group
                key={component.id}
                x={component.position.x}
                y={component.position.y}
                draggable
                onMouseDown={(event) => {
                  event.cancelBubble = true;
                  selectComponent(component.id);
                }}
                onDragEnd={(event) => {
                  moveComponent(component.id, { x: event.target.x(), y: event.target.y() });
                }}
              >
                <Rect
                  width={cardWidth}
                  height={cardHeight}
                  cornerRadius={8}
                  fill={color.fill}
                  stroke={isSelected ? "#111827" : color.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  shadowColor="rgba(15, 23, 42, 0.18)"
                  shadowBlur={isSelected ? 18 : 8}
                  shadowOffsetY={isSelected ? 8 : 4}
                />
                <Text x={16} y={14} text={component.name} fontSize={15} fill="#172033" fontStyle="700" />
                <Text x={16} y={38} text={component.role} fontSize={12} fill="#526071" width={140} ellipsis />
                <Text
                  x={16}
                  y={62}
                  text={`${component.provider.toUpperCase()} / ${component.availability}`}
                  fontSize={11}
                  fill="#667085"
                />
                {componentSignals.length > 0 && (
                  <Group x={148} y={54}>
                    <Rect width={20} height={20} cornerRadius={10} fill="#fff7ed" stroke="#fb923c" />
                    <Text x={7} y={4} text={String(componentSignals.length)} fontSize={11} fill="#c2410c" />
                  </Group>
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>

    </main>
  );
}
