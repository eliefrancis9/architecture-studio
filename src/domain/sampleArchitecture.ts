import type { Architecture, ArchitectureDecision, TradeoffProfile } from "./architecture";

const multiRegionTradeoffs: TradeoffProfile = {
  cost: {
    sentiment: "worsens",
    delta: 4200,
    unit: "usd-monthly",
    explanation: "Additional regional capacity, data replication, and failover testing increase monthly run cost.",
  },
  risk: {
    sentiment: "improves",
    delta: -32,
    unit: "risk-score",
    explanation: "A regional outage no longer maps directly to checkout unavailability.",
  },
  complexity: {
    sentiment: "worsens",
    delta: 7,
    unit: "complexity-points",
    explanation: "Traffic management, data consistency, and deployment coordination become more involved.",
  },
  operability: {
    sentiment: "worsens",
    delta: -10,
    unit: "operability-score",
    explanation: "Teams need stronger runbooks and regular failover drills to operate the design confidently.",
  },
};

const singleRegionTradeoffs: TradeoffProfile = {
  cost: {
    sentiment: "improves",
    delta: -4200,
    unit: "usd-monthly",
    explanation: "The platform avoids duplicate regional capacity while demand is still being validated.",
  },
  risk: {
    sentiment: "worsens",
    delta: 32,
    unit: "risk-score",
    explanation: "Regional infrastructure incidents remain a direct availability risk for checkout.",
  },
  complexity: {
    sentiment: "improves",
    delta: -5,
    unit: "complexity-points",
    explanation: "A simpler deployment topology reduces coordination overhead.",
  },
  operability: {
    sentiment: "neutral",
    delta: 0,
    unit: "operability-score",
    explanation: "Operational load stays familiar, but resilience assumptions need to be explicit.",
  },
};

const checkoutResilienceDecision: ArchitectureDecision = {
  id: "decision-checkout-resilience",
  title: "Checkout resilience posture",
  status: "proposed",
  context: "Checkout is mission-critical, but the base design currently uses a single-region API tier.",
  selectedOptionId: "option-single-region",
  linkedComponentIds: ["component-api"],
  linkedDependencyIds: ["dependency-api-db"],
  linkedNetworkIds: ["network-edge"],
  linkedRiskIds: ["resilience-component-api"],
  satisfiesConstraintIds: ["constraint-monthly-cost", "constraint-required-region"],
  violatesConstraintIds: ["constraint-availability", "constraint-checkout-rto"],
  options: [
    {
      id: "option-single-region",
      title: "Keep single-region API tier",
      description: "Prioritize early delivery and cost control while documenting resilience exposure.",
      tradeoffs: singleRegionTradeoffs,
    },
    {
      id: "option-multi-region",
      title: "Move checkout API to multi-region",
      description: "Increase resilience for checkout by introducing regional failover.",
      tradeoffs: multiRegionTradeoffs,
    },
  ],
};

export const sampleArchitecture: Architecture = {
  id: "arch-retail-platform",
  name: "Retail Platform Modernization",
  description: "Scenario-backed architecture model for a customer-facing commerce platform.",
  customerContext: "High-traffic retail workload with resilience, compliance, and cost visibility needs.",
  constraints: [
    {
      id: "constraint-monthly-cost",
      type: "cost",
      priority: "high",
      description: "Keep the modeled platform run-rate below the migration business case threshold.",
      targetValue: 9000,
    },
    {
      id: "constraint-required-region",
      type: "region",
      priority: "medium",
      description: "Primary customer-facing services must run in the approved US East region.",
      targetValue: "us-east-1",
    },
  ],
  activeScenarioId: "base",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  baseScenario: {
    id: "base",
    name: "Base",
    intent: "Balanced starting architecture for stakeholder alignment.",
    constraints: [
      {
        id: "constraint-availability",
        type: "availability",
        priority: "high",
        description: "Checkout must remain available during a zonal infrastructure issue.",
        targetValue: "multi-zone",
      },
      {
        id: "constraint-checkout-rto",
        type: "availability",
        priority: "high",
        description: "Checkout recovery objective should be one hour or better.",
        targetValue: 1,
      },
    ],
    networks: [
      {
        id: "network-edge",
        name: "Edge network",
        provider: "aws",
        region: "us-east-1",
        exposure: "public",
        segmentation: "flat",
      },
    ],
    components: [
      {
        id: "component-api",
        name: "Commerce API",
        type: "compute",
        provider: "aws",
        role: "Customer checkout and catalog API",
        region: "us-east-1",
        availability: "single",
        exposure: "public",
        criticality: "mission-critical",
        networkId: "network-edge",
        tags: ["checkout", "api"],
        dependencies: ["component-db"],
        costProfile: {
          model: "payg",
          monthlyEstimate: 2400,
          currency: "USD",
          confidence: "medium",
        },
        operability: {
          owner: "Platform",
          monitoring: "basic",
          recoveryObjectiveHours: 4,
        },
        position: { x: 280, y: 190 },
      },
      {
        id: "component-db",
        name: "Order Store",
        type: "storage",
        provider: "aws",
        role: "Transactional order persistence",
        region: "us-east-1",
        availability: "multi-zone",
        exposure: "private",
        criticality: "high",
        networkId: "network-edge",
        tags: ["orders", "data"],
        dependencies: [],
        costProfile: {
          model: "reserved",
          monthlyEstimate: 5200,
          currency: "USD",
          confidence: "high",
        },
        operability: {
          owner: "Data Platform",
          monitoring: "slo-backed",
          recoveryObjectiveHours: 1,
        },
        position: { x: 650, y: 320 },
      },
    ],
    dependencies: [
      {
        id: "dependency-api-db",
        fromComponentId: "component-api",
        toComponentId: "component-db",
        kind: "sync",
        protocol: "TLS",
        description: "Checkout writes orders synchronously.",
      },
    ],
    decisions: [checkoutResilienceDecision],
    risks: [],
  },
  variants: [
    {
      id: "variant-a",
      name: "Cost Focus",
      intent: "Cost-optimized variant for early migration economics.",
      baseScenarioId: "base",
      overrides: {
        decisions: {
          "decision-checkout-resilience": {
            selectedOptionId: "option-single-region",
          },
        },
      },
    },
    {
      id: "variant-b",
      name: "Resilience Focus",
      intent: "Resilience-oriented variant for executive review.",
      baseScenarioId: "base",
      overrides: {
        components: {
          "component-api": {
            availability: "multi-region",
            region: "us-east-1/us-west-2",
            costProfile: {
              model: "payg",
              monthlyEstimate: 6600,
              currency: "USD",
              confidence: "medium",
            },
            operability: {
              owner: "Platform",
              monitoring: "slo-backed",
              recoveryObjectiveHours: 1,
            },
          },
        },
        networks: {
          "network-edge": {
            segmentation: "tiered",
          },
        },
        decisions: {
          "decision-checkout-resilience": {
            selectedOptionId: "option-multi-region",
            status: "accepted",
            satisfiesConstraintIds: ["constraint-availability", "constraint-checkout-rto"],
            violatesConstraintIds: [],
          },
        },
      },
    },
  ],
};
