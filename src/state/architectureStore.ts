import { create } from "zustand";
import type {
  Architecture,
  ArchitectureComponent,
  ArchitectureDecision,
  ArchitectureScenario,
  ComponentType,
  Dependency,
  ScenarioOverrides,
} from "../domain/architecture";
import { sampleArchitecture } from "../domain/sampleArchitecture";
import { resolveScenario } from "../domain/scenarioResolver";

type ComponentPatch = Partial<Omit<ArchitectureComponent, "id" | "position">> & {
  position?: Partial<ArchitectureComponent["position"]>;
};

interface ArchitectureState {
  architecture: Architecture;
  selectedComponentId?: string;
  activeScenario: () => ArchitectureScenario;
  selectedComponent: () => ArchitectureComponent | undefined;
  setActiveScenario: (scenarioId: string) => void;
  selectComponent: (componentId?: string) => void;
  addComponent: (type: ComponentType, position: ArchitectureComponent["position"]) => void;
  updateComponent: (componentId: string, patch: ComponentPatch) => void;
  moveComponent: (componentId: string, position: ArchitectureComponent["position"]) => void;
  addDependency: (fromComponentId: string, toComponentId: string) => void;
}

const componentDefaults: Record<ComponentType, Pick<ArchitectureComponent, "name" | "role" | "exposure">> = {
  compute: { name: "Compute service", role: "Application workload", exposure: "internal" },
  network: { name: "Network boundary", role: "Traffic segmentation", exposure: "internal" },
  storage: { name: "Storage service", role: "Persistent data", exposure: "private" },
  identity: { name: "Identity provider", role: "Access control", exposure: "internal" },
  security: { name: "Security layer", role: "Policy enforcement", exposure: "public" },
  integration: { name: "Integration service", role: "System connectivity", exposure: "internal" },
  observability: { name: "Observability stack", role: "Telemetry and incident response", exposure: "private" },
};

const now = () => new Date().toISOString();

function updateActiveScenario(
  architecture: Architecture,
  mutateBase: (scenario: ArchitectureScenario) => ArchitectureScenario,
  mutateVariant: (overrides: ScenarioOverrides, resolved: ArchitectureScenario) => ScenarioOverrides,
): Architecture {
  if (architecture.activeScenarioId === architecture.baseScenario.id) {
    return {
      ...architecture,
      updatedAt: now(),
      baseScenario: mutateBase(architecture.baseScenario),
    };
  }

  return {
    ...architecture,
    updatedAt: now(),
    variants: architecture.variants.map((variant) => {
      if (variant.id !== architecture.activeScenarioId) {
        return variant;
      }

      return {
        ...variant,
        overrides: mutateVariant(variant.overrides, resolveScenario(architecture, variant.id)),
      };
    }),
  };
}

function upsertOverride<T extends { id: string }>(
  overrides: Record<string, Partial<T>> | undefined,
  entity: T,
): Record<string, Partial<T>> {
  return {
    ...(overrides ?? {}),
    [entity.id]: entity,
  };
}

function upsertDecisionOverride(
  overrides: Record<string, Partial<ArchitectureDecision>> | undefined,
  decision: ArchitectureDecision,
): Record<string, Partial<ArchitectureDecision>> {
  return {
    ...(overrides ?? {}),
    [decision.id]: decision,
  };
}

export const useArchitectureStore = create<ArchitectureState>((set, get) => ({
  architecture: sampleArchitecture,
  selectedComponentId: "component-api",
  activeScenario: () => {
    const { architecture } = get();
    return resolveScenario(architecture, architecture.activeScenarioId);
  },
  selectedComponent: () => {
    const selectedComponentId = get().selectedComponentId;
    return get().activeScenario().components.find((component) => component.id === selectedComponentId);
  },
  setActiveScenario: (scenarioId) =>
    set((state) => ({
      architecture: { ...state.architecture, activeScenarioId: scenarioId },
      selectedComponentId: undefined,
    })),
  selectComponent: (componentId) => set({ selectedComponentId: componentId }),
  addComponent: (type, position) =>
    set((state) => {
      const defaults = componentDefaults[type];
      const id = `${type}-${crypto.randomUUID()}`;
      const component: ArchitectureComponent = {
        id,
        type,
        name: defaults.name,
        provider: "aws",
        role: defaults.role,
        region: "us-east-1",
        availability: "single",
        exposure: defaults.exposure,
        criticality: "medium",
        tags: [],
        dependencies: [],
        costProfile: {
          model: "payg",
          monthlyEstimate: 0,
          currency: "USD",
          confidence: "low",
        },
        operability: {
          owner: "Unassigned",
          monitoring: "none",
        },
        position,
      };

      return {
        architecture: updateActiveScenario(
          state.architecture,
          (scenario) => ({
            ...scenario,
            components: [...scenario.components, component],
          }),
          (overrides) => ({
            ...overrides,
            componentAdditions: [...(overrides.componentAdditions ?? []), component],
          }),
        ),
        selectedComponentId: id,
      };
    }),
  updateComponent: (componentId, patch) =>
    set((state) => ({
      architecture: updateActiveScenario(
        state.architecture,
        (scenario) => ({
          ...scenario,
          components: scenario.components.map((component) =>
            component.id === componentId
              ? {
                  ...component,
                  ...patch,
                  position: patch.position ? { ...component.position, ...patch.position } : component.position,
                }
              : component,
          ),
        }),
        (overrides, resolved) => {
          const component = resolved.components.find((candidate) => candidate.id === componentId);
          if (!component) {
            return overrides;
          }

          const updatedComponent = {
            ...component,
            ...patch,
            position: patch.position ? { ...component.position, ...patch.position } : component.position,
          };

          if (overrides.componentAdditions?.some((candidate) => candidate.id === componentId)) {
            return {
              ...overrides,
              componentAdditions: overrides.componentAdditions.map((candidate) =>
                candidate.id === componentId ? updatedComponent : candidate,
              ),
            };
          }

          return {
            ...overrides,
            components: upsertOverride(overrides.components, updatedComponent),
          };
        },
      ),
    })),
  moveComponent: (componentId, position) => get().updateComponent(componentId, { position }),
  addDependency: (fromComponentId, toComponentId) =>
    set((state) => {
      if (fromComponentId === toComponentId) {
        return state;
      }

      const resolved = resolveScenario(state.architecture, state.architecture.activeScenarioId);
      if (resolved.dependencies.some((dependency) => dependency.fromComponentId === fromComponentId && dependency.toComponentId === toComponentId)) {
        return state;
      }

      const dependency: Dependency = {
        id: `dependency-${crypto.randomUUID()}`,
        fromComponentId,
        toComponentId,
        kind: "sync",
      };

      return {
        architecture: updateActiveScenario(
          state.architecture,
          (scenario) => ({
            ...scenario,
            dependencies: [...scenario.dependencies, dependency],
            components: scenario.components.map((component) =>
              component.id === fromComponentId
                ? { ...component, dependencies: Array.from(new Set([...component.dependencies, toComponentId])) }
                : component,
            ),
          }),
          (overrides, variantScenario) => {
            const sourceComponent = variantScenario.components.find((component) => component.id === fromComponentId);
            const updatedSource = sourceComponent
              ? {
                  ...sourceComponent,
                  dependencies: Array.from(new Set([...sourceComponent.dependencies, toComponentId])),
                }
              : undefined;

            return {
              ...overrides,
              dependencyAdditions: [...(overrides.dependencyAdditions ?? []), dependency],
              components: updatedSource ? upsertOverride(overrides.components, updatedSource) : overrides.components,
            };
          },
        ),
      };
    }),
}));
