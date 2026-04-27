export type Provider = "aws" | "azure" | "gcp" | "onprem" | "saas" | "edge";

export type ComponentType =
  | "compute"
  | "network"
  | "storage"
  | "identity"
  | "security"
  | "integration"
  | "observability";

export type AvailabilityPattern = "single" | "multi-zone" | "multi-region";
export type Exposure = "private" | "internal" | "public";
export type Criticality = "low" | "medium" | "high" | "mission-critical";
export type CostModel = "payg" | "reserved" | "committed" | "license" | "unknown";
export type DependencyKind = "sync" | "async" | "data" | "control-plane" | "observability";
export type DecisionStatus = "proposed" | "accepted" | "superseded";
export type TradeoffSentiment = "improves" | "neutral" | "worsens";

export interface CostProfile {
  model: CostModel;
  monthlyEstimate: number;
  currency: "USD" | "EUR" | "GBP";
  confidence: "low" | "medium" | "high";
}

export interface OperabilityProfile {
  owner: string;
  runbookUrl?: string;
  monitoring: "none" | "basic" | "slo-backed";
  recoveryObjectiveHours?: number;
}

export interface ComponentPosition {
  x: number;
  y: number;
}

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: ComponentType;
  provider: Provider;
  role: string;
  region: string;
  availability: AvailabilityPattern;
  exposure: Exposure;
  criticality: Criticality;
  networkId?: string;
  tags: string[];
  dependencies: string[];
  costProfile: CostProfile;
  operability: OperabilityProfile;
  position: ComponentPosition;
}

export interface NetworkBoundary {
  id: string;
  name: string;
  provider: Provider;
  region: string;
  cidr?: string;
  exposure: Exposure;
  segmentation: "flat" | "tiered" | "zero-trust";
}

export interface Dependency {
  id: string;
  fromComponentId: string;
  toComponentId: string;
  kind: DependencyKind;
  protocol?: string;
  description?: string;
}

export interface ArchitectureConstraint {
  id: string;
  label: string;
  category: "cost" | "security" | "resilience" | "delivery" | "compliance";
  priority: "low" | "medium" | "high";
  description: string;
}

export interface TradeoffDimension {
  sentiment: TradeoffSentiment;
  delta: number;
  unit: "usd-monthly" | "risk-score" | "complexity-points" | "operability-score";
  explanation: string;
}

export interface TradeoffProfile {
  cost: TradeoffDimension;
  risk: TradeoffDimension;
  complexity: TradeoffDimension;
  operability: TradeoffDimension;
}

export interface ArchitectureDecisionOption {
  id: string;
  title: string;
  description: string;
  tradeoffs: TradeoffProfile;
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  status: DecisionStatus;
  context: string;
  selectedOptionId: string;
  options: ArchitectureDecisionOption[];
  linkedComponentIds: string[];
  linkedDependencyIds: string[];
  linkedNetworkIds: string[];
  linkedRiskIds: string[];
}

export interface ArchitectureScenario {
  id: string;
  name: string;
  intent: string;
  constraints: ArchitectureConstraint[];
  components: ArchitectureComponent[];
  networks: NetworkBoundary[];
  dependencies: Dependency[];
  decisions: ArchitectureDecision[];
  risks: RiskSignal[];
}

export interface ScenarioOverrides {
  constraints?: ArchitectureConstraint[];
  components?: Record<string, Partial<ArchitectureComponent>>;
  componentAdditions?: ArchitectureComponent[];
  networks?: Record<string, Partial<NetworkBoundary>>;
  networkAdditions?: NetworkBoundary[];
  dependencies?: Record<string, Partial<Dependency>>;
  dependencyAdditions?: Dependency[];
  decisions?: Record<string, Partial<ArchitectureDecision>>;
  decisionAdditions?: ArchitectureDecision[];
  riskAdditions?: RiskSignal[];
}

export interface ArchitectureVariant {
  id: string;
  name: string;
  intent: string;
  baseScenarioId: string;
  overrides: ScenarioOverrides;
}

export interface Architecture {
  id: string;
  name: string;
  description: string;
  customerContext: string;
  baseScenario: ArchitectureScenario;
  variants: ArchitectureVariant[];
  activeScenarioId: string;
  createdAt: string;
  updatedAt: string;
}

export type RiskSignalSeverity = "info" | "warning" | "attention";
export type RiskSignalCategory = "resilience" | "security" | "scalability" | "operability" | "cost";

export interface RiskSignal {
  id: string;
  scenarioId: string;
  category: RiskSignalCategory;
  severity: RiskSignalSeverity;
  title: string;
  explanation: string;
  tradeoff: string;
  componentIds: string[];
}
