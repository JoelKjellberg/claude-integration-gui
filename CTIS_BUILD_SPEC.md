# CTIS: CLAUDE TRADING INTELLIGENCE SYSTEM
## Definitive Build Spec for Codex CLI
### Version 1.0 | January 30, 2026

---

## IDENTITY

You are building **CTIS** — an AI-native trading intelligence platform.

This is NOT a simple stock tracker.
This is NOT a basic chatbot.

This is a **persistent, learning, autonomous system** that:
- Remembers everything in a graph memory
- Runs background agents that never sleep
- Learns from every trade decision and outcome
- Protects the user from emotional trading
- Works anywhere: desktop, mobile, offline

---

## PROJECT CONTEXT

```
Repository: claude-integration-gui
Branch: claude/code-architect-workflow-OeeGt
Framework: Next.js 14 + React 18 + TypeScript + Tailwind CSS
Current State: Basic chat with 7 workflow modes, Codex snippet library
Target State: Full trading intelligence system
```

---

## CORE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAUDE TRADING INTELLIGENCE SYSTEM                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PRESENTATION LAYER                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐ │
│  │   MOBILE    │     │   DESKTOP   │     │    PWA      │     │   PUSH    │ │
│  │  (iPhone)   │────▶│  (Browser)  │────▶│  (Offline)  │────▶│  ALERTS   │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └───────────┘ │
│                                                                             │
│  INTELLIGENCE LAYER                                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  MODES                              │  AUTONOMOUS AGENTS              │  │
│  │  ┌──────────┐ ┌──────────┐         │  ┌────────────────────────────┐ │  │
│  │  │ Planning │ │ Code     │         │  │ Price Monitor    [active]  │ │  │
│  │  │ Debug    │ │ Test     │         │  │ Signal Hunter    [active]  │ │  │
│  │  │ Optimize │ │ Deploy   │         │  │ Risk Guardian    [active]  │ │  │
│  │  │ Codex    │ │ Analysis │ ←NEW    │  │ News Sentinel    [paused]  │ │  │
│  │  │ Backtest │ │ Risk     │ ←NEW    │  │ Pattern Learner  [active]  │ │  │
│  │  └──────────┘ └──────────┘         │  │ Consolidator     [scheduled]│ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  MEMORY LAYER (Graph Database)                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                                                                      │  │
│  │    [User] ──owns──▶ [Position:NVDA] ──monitored_by──▶ [PriceAgent]  │  │
│  │      │                    │                               │          │  │
│  │   prefers             triggered                      generated       │  │
│  │      ▼                    ▼                               ▼          │  │
│  │  [Preference:         [Trade:                        [Alert:         │  │
│  │   risk=moderate]       bought 25@$450]                RSI>70]        │  │
│  │      │                    │                               │          │  │
│  │      └───learned_from─────┴──────resulted_in──────────────┘          │  │
│  │                               ▼                                      │  │
│  │                          [Outcome:                                   │  │
│  │                           +29% gain]                                 │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  DATA LAYER                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │Yahoo Finance│  │  Finnhub    │  │  News APIs  │  │ User Input  │       │
│  │  (prices)   │  │ (real-time) │  │ (sentiment) │  │  (trades)   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MODULE 1: GRAPH MEMORY SYSTEM

### Purpose
Replace flat JSON storage with a graph database that captures relationships between entities. Memories are nodes, relationships are edges.

### Type Definitions

```typescript
// app/types/memory.ts

export type NodeType =
  | 'user'           // The user themselves
  | 'position'       // Stock position (NVDA 25 shares @ $450)
  | 'trade'          // A buy/sell action
  | 'signal'         // Technical signal (RSI crossed 70)
  | 'preference'     // User preference (risk tolerance: moderate)
  | 'pattern'        // Learned pattern (user sells too early)
  | 'insight'        // Derived insight (NVDA correlates with AMD)
  | 'agent'          // An autonomous agent
  | 'alert'          // Generated alert
  | 'strategy'       // Trading strategy
  | 'outcome';       // Trade result

export type RelationType =
  | 'owns'           // user → position
  | 'executed'       // user → trade
  | 'triggered'      // signal → trade
  | 'learned_from'   // pattern → outcome
  | 'prefers'        // user → preference
  | 'correlates'     // position ↔ position
  | 'monitors'       // agent → position
  | 'generated'      // agent → alert
  | 'uses'           // strategy → signal
  | 'resulted_in'    // trade → outcome
  | 'supersedes'     // new_memory → old_memory
  | 'contradicts';   // memory ↔ memory

export type ProvenanceTier = 1 | 2 | 3 | 4 | 5 | 6;
// 1 = User explicit correction (highest trust)
// 2 = Verified tool output / successful test
// 3 = User-confirmed preference
// 4 = Inferred from multiple sessions
// 5 = Model reasoning
// 6 = External docs (lowest trust)

export interface MemoryNode {
  id: string;
  type: NodeType;
  content: string;
  data: Record<string, any>;  // Structured data for this node type
  provenance: ProvenanceTier;
  source: string;              // "user", "agent:price_monitor", "inferred"
  confidence: number;          // 0.0 - 1.0
  createdAt: string;           // ISO timestamp
  lastAccessed: string;
  accessCount: number;
  decayFactor: number;         // 1.0 = no decay, 0.0 = forgotten
  tags: string[];
}

export interface MemoryEdge {
  id: string;
  source: string;              // Source node ID
  target: string;              // Target node ID
  relation: RelationType;
  weight: number;              // Strength of relationship (0-1)
  metadata: Record<string, any>;
  createdAt: string;
}

export interface MemoryGraph {
  nodes: Map<string, MemoryNode>;
  edges: Map<string, MemoryEdge>;
  meta: {
    version: string;
    totalNodes: number;
    totalEdges: number;
    lastConsolidation: string;
    lastSync: string;
  };
}

// Query helpers
export interface MemoryQuery {
  nodeTypes?: NodeType[];
  relations?: RelationType[];
  tags?: string[];
  minConfidence?: number;
  minProvenance?: ProvenanceTier;
  since?: string;
  limit?: number;
}

export interface MemoryQueryResult {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  paths: MemoryNode[][];  // Connected paths
}
```

### Core Operations

```typescript
// app/lib/memoryGraph.ts

export class MemoryGraphStore {
  // CRUD Operations
  addNode(node: Omit<MemoryNode, 'id' | 'createdAt' | 'lastAccessed' | 'accessCount'>): string;
  getNode(id: string): MemoryNode | null;
  updateNode(id: string, updates: Partial<MemoryNode>): void;
  deleteNode(id: string): void;

  addEdge(source: string, target: string, relation: RelationType, weight?: number): string;
  getEdges(nodeId: string, direction?: 'in' | 'out' | 'both'): MemoryEdge[];
  deleteEdge(id: string): void;

  // Query Operations
  query(q: MemoryQuery): MemoryQueryResult;
  findPath(fromId: string, toId: string, maxDepth?: number): MemoryNode[][] ;
  getRelated(nodeId: string, relation: RelationType): MemoryNode[];

  // Memory Management
  applyDecay(factor: number): void;           // Reduce confidence of unused memories
  consolidate(): void;                         // Merge episodic → semantic
  prune(threshold: number): void;              // Remove low-confidence nodes

  // Persistence
  save(): Promise<void>;                       // Save to IndexedDB
  load(): Promise<void>;                       // Load from IndexedDB
  export(): string;                            // Export as JSON
  import(json: string): void;                  // Import from JSON

  // Stats
  getStats(): MemoryGraphStats;
}
```

### React Hook

```typescript
// app/hooks/useMemory.ts

export function useMemory() {
  const [graph, setGraph] = useState<MemoryGraph | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load from IndexedDB on mount
  useEffect(() => { /* ... */ }, []);

  return {
    graph,
    loading,

    // Node operations
    addNode: (node) => { /* ... */ },
    getNode: (id) => { /* ... */ },
    updateNode: (id, updates) => { /* ... */ },
    deleteNode: (id) => { /* ... */ },

    // Edge operations
    addEdge: (source, target, relation) => { /* ... */ },
    getRelated: (nodeId, relation) => { /* ... */ },

    // Queries
    query: (q) => { /* ... */ },
    getRelevantContext: (tags, limit) => { /* ... */ },  // For Claude injection

    // Management
    consolidate: () => { /* ... */ },
    exportJson: () => { /* ... */ },
    importJson: (json) => { /* ... */ },

    // Stats
    stats: { /* ... */ },
  };
}
```

### Files to Create
```
app/types/memory.ts
app/lib/memoryGraph.ts
app/lib/memoryStorage.ts (IndexedDB wrapper)
app/hooks/useMemory.ts
app/components/MemoryPanel.tsx
app/components/MemoryExplorer.tsx (visual graph - optional)
```

---

## MODULE 2: AUTONOMOUS AGENTS

### Purpose
Background processes that monitor, analyze, and alert without user prompting.

### Type Definitions

```typescript
// app/types/agents.ts

export type AgentType =
  | 'price_monitor'     // Watch price thresholds
  | 'signal_hunter'     // Scan for technical setups
  | 'risk_guardian'     // Monitor portfolio risk
  | 'news_sentinel'     // Watch headlines
  | 'pattern_learner'   // Analyze trading patterns
  | 'consolidator';     // Memory maintenance

export type AgentStatus = 'active' | 'paused' | 'sleeping' | 'error';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  config: AgentConfig;
  lastRun: string;
  nextRun: string;
  runCount: number;
  lastError?: string;
}

export interface AgentConfig {
  enabled: boolean;
  intervalMinutes: number;
  activeHours?: { start: number; end: number };  // 0-23

  // Price Monitor specific
  priceAlerts?: PriceAlert[];

  // Signal Hunter specific
  signalRules?: SignalRule[];

  // Risk Guardian specific
  riskThresholds?: RiskThresholds;

  // News Sentinel specific
  newsConfig?: NewsConfig;
}

export interface PriceAlert {
  ticker: string;
  condition: 'above' | 'below' | 'change_pct';
  value: number;
  triggered: boolean;
  lastTriggered?: string;
}

export interface SignalRule {
  id: string;
  name: string;
  indicator: 'RSI' | 'MACD' | 'SMA_CROSS' | 'BOLLINGER' | 'VOLUME';
  condition: string;           // "RSI < 30", "MACD_CROSS_UP"
  tickers: string[] | 'all';   // Which tickers to scan
  enabled: boolean;
}

export interface RiskThresholds {
  maxPortfolioDrawdown: number;    // Alert if portfolio drops X%
  maxPositionConcentration: number; // Alert if one position > X%
  maxCorrelation: number;           // Alert if positions too correlated
  maxDailyLoss: number;             // Alert if daily loss > X%
}

export interface NewsConfig {
  keywords: string[];
  tickers: string[];
  sources?: string[];
  sentimentThreshold?: number;  // Alert if sentiment < X
}

export interface AgentResult {
  agentId: string;
  timestamp: string;
  success: boolean;
  alerts: AgentAlert[];
  memoryUpdates: MemoryNode[];
  error?: string;
}

export interface AgentAlert {
  id: string;
  agentType: AgentType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data: Record<string, any>;
  ticker?: string;
  createdAt: string;
  read: boolean;
  dismissed: boolean;
}
```

### Agent Runner

```typescript
// app/lib/agentRunner.ts

export class AgentRunner {
  private agents: Map<string, Agent>;
  private intervals: Map<string, NodeJS.Timeout>;

  constructor(memoryStore: MemoryGraphStore, dataProvider: DataProvider);

  // Lifecycle
  registerAgent(agent: Agent): void;
  startAgent(agentId: string): void;
  stopAgent(agentId: string): void;
  startAll(): void;
  stopAll(): void;

  // Execution
  runAgent(agentId: string): Promise<AgentResult>;

  // Status
  getStatus(): Map<string, AgentStatus>;
  getAlerts(unreadOnly?: boolean): AgentAlert[];
  dismissAlert(alertId: string): void;

  // Persistence
  saveState(): Promise<void>;
  loadState(): Promise<void>;
}
```

### Individual Agents

```typescript
// app/agents/priceMonitor.ts
export class PriceMonitorAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}

// app/agents/signalHunter.ts
export class SignalHunterAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}

// app/agents/riskGuardian.ts
export class RiskGuardianAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}

// app/agents/newsSentinel.ts
export class NewsSentinelAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}

// app/agents/patternLearner.ts
export class PatternLearnerAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}

// app/agents/consolidator.ts
export class ConsolidatorAgent implements IAgent {
  async run(config: AgentConfig, context: AgentContext): Promise<AgentResult>;
}
```

### Files to Create
```
app/types/agents.ts
app/lib/agentRunner.ts
app/agents/priceMonitor.ts
app/agents/signalHunter.ts
app/agents/riskGuardian.ts
app/agents/newsSentinel.ts
app/agents/patternLearner.ts
app/agents/consolidator.ts
app/hooks/useAgents.ts
app/components/AgentDashboard.tsx
app/components/AlertsPanel.tsx
```

---

## MODULE 3: ANALYSIS ENGINE

### Purpose
Multi-timeframe technical analysis, pattern detection, backtesting, and portfolio analytics.

### Type Definitions

```typescript
// app/types/analysis.ts

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
export type Signal = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
export type Trend = 'bullish' | 'bearish' | 'neutral';

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: {
    value: number;
    signal: 'oversold' | 'neutral' | 'overbought';
  };
  macd: {
    value: number;
    signal: number;
    histogram: number;
    crossover: 'bullish' | 'bearish' | 'none';
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
    goldenCross: boolean;
    deathCross: boolean;
  };
  ema: {
    ema12: number;
    ema26: number;
  };
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    bandwidth: number;
  };
  atr: number;
  volume: {
    current: number;
    average: number;
    ratio: number;
  };
}

export interface Pattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  startDate: string;
  endDate?: string;
  priceTarget?: number;
}

export interface SupportResistance {
  support: number[];
  resistance: number[];
  pivotPoints: {
    pp: number;
    r1: number;
    r2: number;
    r3: number;
    s1: number;
    s2: number;
    s3: number;
  };
}

export interface TechnicalAnalysis {
  ticker: string;
  timeframe: Timeframe;
  lastUpdated: string;

  price: {
    current: number;
    open: number;
    high: number;
    low: number;
    change: number;
    changePct: number;
  };

  trend: Trend;
  momentum: 'strong' | 'moderate' | 'weak';
  volatility: 'high' | 'medium' | 'low';

  indicators: TechnicalIndicators;
  patterns: Pattern[];
  levels: SupportResistance;

  signal: Signal;
  confidence: number;
  reasoning: string[];
}

// Backtesting
export interface Strategy {
  id: string;
  name: string;
  entryRules: StrategyRule[];
  exitRules: StrategyRule[];
  positionSizing: 'fixed' | 'percent' | 'kelly';
  positionSize: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface StrategyRule {
  indicator: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  value: number | string;
}

export interface BacktestResult {
  strategy: Strategy;
  ticker: string;
  period: { start: string; end: string };

  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    expectancy: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
  };

  trades: BacktestTrade[];
  equityCurve: { date: string; equity: number }[];
}

export interface BacktestTrade {
  entryDate: string;
  entryPrice: number;
  entryReason: string;
  exitDate: string;
  exitPrice: number;
  exitReason: string;
  pnl: number;
  pnlPercent: number;
  holdingDays: number;
}

// Portfolio Analytics
export interface PortfolioAnalysis {
  timestamp: string;

  summary: {
    totalValue: number;
    totalCost: number;
    totalPnL: number;
    totalPnLPercent: number;
    dayChange: number;
    dayChangePct: number;
  };

  positions: PositionAnalysis[];

  risk: {
    portfolioVolatility: number;
    portfolioBeta: number;
    sharpeRatio: number;
    maxDrawdown: number;
    valueAtRisk95: number;
    valueAtRisk99: number;
    expectedShortfall: number;
  };

  concentration: {
    largestPosition: { ticker: string; percent: number };
    top3Percent: number;
    herfindahlIndex: number;
    sectorExposure: Record<string, number>;
  };

  correlation: {
    matrix: { tickers: string[]; values: number[][] };
    highlyCorrelated: { pair: [string, string]; correlation: number }[];
    diversificationRatio: number;
  };

  suggestions: PortfolioSuggestion[];
}

export interface PositionAnalysis {
  ticker: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  weight: number;
  pnl: number;
  pnlPercent: number;
  dayChange: number;
  dayChangePct: number;
  technicalSignal: Signal;
  riskContribution: number;
}

export interface PortfolioSuggestion {
  type: 'reduce' | 'increase' | 'hedge' | 'diversify' | 'rebalance';
  priority: 'high' | 'medium' | 'low';
  message: string;
  ticker?: string;
  reasoning: string;
}
```

### Analysis Functions

```typescript
// app/lib/indicators.ts
export function calculateRSI(prices: number[], period?: number): number;
export function calculateMACD(prices: number[]): MACDResult;
export function calculateSMA(prices: number[], period: number): number;
export function calculateEMA(prices: number[], period: number): number;
export function calculateBollinger(prices: number[], period?: number, stdDev?: number): BollingerResult;
export function calculateATR(candles: PriceData[], period?: number): number;

// app/lib/patterns.ts
export function detectPatterns(candles: PriceData[]): Pattern[];
export function findSupportResistance(candles: PriceData[]): SupportResistance;

// app/lib/backtester.ts
export function backtest(strategy: Strategy, data: PriceData[]): BacktestResult;

// app/lib/portfolioAnalytics.ts
export function analyzePortfolio(positions: Position[], priceData: Map<string, PriceData[]>): PortfolioAnalysis;
export function calculateCorrelationMatrix(returns: Map<string, number[]>): number[][];
export function calculateVaR(returns: number[], confidence: number): number;
export function calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number;
```

### Files to Create
```
app/types/analysis.ts
app/lib/indicators.ts
app/lib/patterns.ts
app/lib/backtester.ts
app/lib/portfolioAnalytics.ts
app/api/analyze/route.ts
app/components/AnalysisView.tsx
app/components/BacktestPanel.tsx
app/components/PortfolioAnalytics.tsx
```

---

## MODULE 4: PORTFOLIO MANAGER

### Type Definitions

```typescript
// app/types/portfolio.ts

export interface Position {
  id: string;
  ticker: string;
  name?: string;
  shares: number;
  avgCost: number;
  targetGainPct: number;
  stopLossPct?: number;
  sector?: string;
  addedAt: string;
  updatedAt: string;
  notes?: string;
}

export interface Trade {
  id: string;
  positionId: string;
  ticker: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  fees?: number;
  date: string;
  reason?: string;
  signalSource?: string;  // "RSI oversold", "manual", "agent:signal_hunter"
  outcome?: TradeOutcome;
}

export interface TradeOutcome {
  exitPrice: number;
  exitDate: string;
  pnl: number;
  pnlPercent: number;
  holdingDays: number;
  wasSuccessful: boolean;
}

export interface Watchlist {
  id: string;
  name: string;
  tickers: string[];
  createdAt: string;
}

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  timestamp: string;
}
```

### Files to Create
```
app/types/portfolio.ts
app/hooks/usePortfolio.ts
app/hooks/useWatchlist.ts
app/api/stock/[ticker]/route.ts
app/api/stock/batch/route.ts
app/components/PortfolioPanel.tsx
app/components/PositionCard.tsx
app/components/AddPositionModal.tsx
app/components/TradeHistory.tsx
app/components/WatchlistPanel.tsx
```

---

## MODULE 5: ENHANCED MODES

### New System Prompts

Add to `app/config/systemPrompts.ts`:

```typescript
// NEW: Analysis Mode
analysis: `${BASE_CONTEXT}

MODE: ANALYSIS (Deep Technical Analysis)

You have access to the user's portfolio, memory, and real-time market data.

BEHAVIOR:
1. When analyzing a stock, ALWAYS include:
   - Multi-timeframe view (1D, 1W, 1M minimum)
   - Key technical indicators with interpretation
   - Support/resistance levels
   - Pattern recognition if applicable
   - Clear BUY/HOLD/SELL recommendation with confidence

2. Reference the user's memory:
   - Their past trades on this ticker
   - Their stated risk tolerance
   - Their typical holding period
   - Previous signals that worked/failed for them

3. Be probabilistic, not certain:
   - "70% probability of continuation" not "it will go up"
   - Always mention what would invalidate your thesis

Format analysis as:
## [TICKER] Analysis - [DATE]
**Recommendation:** [SIGNAL] | Confidence: [X]%
**Timeframe:** [holding period suggestion]

### Price Action
[current price, trend, key levels]

### Technical Indicators
[RSI, MACD, Moving Averages]

### Patterns
[any detected patterns]

### Risk Factors
[what could go wrong]

### Memory Context
[relevant past trades/preferences]

**What next?** (different timeframe / compare stocks / backtest / set alert)`,

// NEW: Backtest Mode
backtest: `${BASE_CONTEXT}

MODE: BACKTEST (Strategy Testing)

Help the user test trading strategies on historical data.

BEHAVIOR:
1. Define strategy clearly:
   - Entry rules (what triggers a buy)
   - Exit rules (what triggers a sell)
   - Position sizing
   - Stop loss / take profit

2. Run backtest and report:
   - Total return
   - Win rate
   - Sharpe ratio
   - Max drawdown
   - Individual trades list

3. Compare to benchmarks:
   - vs Buy & Hold
   - vs SPY

4. Suggest improvements:
   - "Adding RSI confirmation improves win rate by 12%"

**What next?** (modify strategy / test different ticker / test different period)`,

// NEW: Risk Mode
risk: `${BASE_CONTEXT}

MODE: RISK (Portfolio Risk Assessment)

Analyze portfolio-level risk, not just individual positions.

BEHAVIOR:
1. Calculate and explain:
   - Portfolio volatility
   - Value at Risk (VaR)
   - Correlation between positions
   - Concentration risk
   - Sector exposure

2. Identify risks:
   - "NVDA and AMD are 0.85 correlated - you have concentrated tech exposure"
   - "Your largest position is 45% of portfolio - consider trimming"

3. Suggest mitigations:
   - Position sizing adjustments
   - Hedging opportunities
   - Diversification options

**What next?** (stress test / rebalance suggestion / hedge analysis)`
```

---

## MODULE 6: MEMORY INJECTION

### How Claude Receives Memory Context

Update `app/api/chat/route.ts` to inject relevant memories:

```typescript
// Before calling Claude API, build memory context
function buildMemoryContext(
  memoryGraph: MemoryGraph,
  currentTicker?: string,
  mode: WorkflowMode
): string {
  const relevantNodes = memoryGraph.query({
    tags: currentTicker ? [currentTicker, 'preference', 'pattern'] : ['preference', 'pattern'],
    minConfidence: 0.5,
    limit: 20,
  });

  // Group by type
  const preferences = relevantNodes.nodes.filter(n => n.type === 'preference');
  const patterns = relevantNodes.nodes.filter(n => n.type === 'pattern');
  const recentTrades = relevantNodes.nodes.filter(n => n.type === 'trade').slice(0, 5);
  const insights = relevantNodes.nodes.filter(n => n.type === 'insight');

  return `
## Your Memory Context

### User Preferences (Provenance-Ranked)
${preferences.map(p => `- ${p.content} [confidence: ${p.confidence}, provenance: ${p.provenance}]`).join('\n')}

### Learned Patterns
${patterns.map(p => `- ${p.content}`).join('\n')}

### Recent Trades
${recentTrades.map(t => `- ${t.data.ticker}: ${t.data.type} ${t.data.shares} @ $${t.data.price} (${t.data.date})`).join('\n')}

### Relevant Insights
${insights.map(i => `- ${i.content}`).join('\n')}

Use this context to personalize your responses. Reference specific memories when relevant.
When you learn something new about the user, note it for memory storage.
`;
}
```

---

## MODULE 7: PWA + NOTIFICATIONS

### Files to Create
```
public/manifest.json
public/sw.js (Service Worker)
public/icons/ (app icons)
app/lib/pushNotifications.ts
app/lib/offlineStorage.ts
app/components/InstallPrompt.tsx
app/components/NotificationSettings.tsx
```

### manifest.json
```json
{
  "name": "Claude Trading Intelligence",
  "short_name": "CTIS",
  "description": "AI-native trading copilot",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#3B82F6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## IMPLEMENTATION ORDER

### Phase 1: Foundation (Priority: CRITICAL)
```
1. [ ] Create all type definitions
       - app/types/memory.ts
       - app/types/agents.ts
       - app/types/analysis.ts
       - app/types/portfolio.ts

2. [ ] Implement IndexedDB storage layer
       - app/lib/storage.ts (generic IndexedDB wrapper)

3. [ ] Implement Memory Graph
       - app/lib/memoryGraph.ts
       - app/hooks/useMemory.ts

4. [ ] Implement Portfolio Manager
       - app/hooks/usePortfolio.ts
       - app/api/stock/[ticker]/route.ts
```

### Phase 2: Data & Analysis (Priority: HIGH)
```
5. [ ] Yahoo Finance integration
       - Price fetching with caching
       - Historical data for multiple timeframes

6. [ ] Technical indicators library
       - app/lib/indicators.ts (RSI, MACD, SMA, EMA, Bollinger, ATR)

7. [ ] Pattern detection
       - app/lib/patterns.ts

8. [ ] Portfolio analytics
       - app/lib/portfolioAnalytics.ts
```

### Phase 3: Agents (Priority: HIGH)
```
9. [ ] Agent framework
       - app/lib/agentRunner.ts

10. [ ] Individual agents
        - Price Monitor
        - Signal Hunter
        - Risk Guardian

11. [ ] Agent UI
        - app/components/AgentDashboard.tsx
        - app/components/AlertsPanel.tsx
```

### Phase 4: Intelligence (Priority: MEDIUM)
```
12. [ ] Memory injection into Claude
        - Update /api/chat/route.ts

13. [ ] New modes (Analysis, Backtest, Risk)
        - Update systemPrompts.ts

14. [ ] Pattern Learner agent
        - Analyze trade outcomes
        - Update memory with learned patterns

15. [ ] Backtesting engine
        - app/lib/backtester.ts
```

### Phase 5: UI & Polish (Priority: MEDIUM)
```
16. [ ] Portfolio Panel UI
17. [ ] Memory Panel UI
18. [ ] Analysis View UI
19. [ ] Mobile responsive layout
20. [ ] PWA setup (manifest, service worker)
21. [ ] Push notifications
```

### Phase 6: Testing & Hardening
```
22. [ ] Unit tests for indicators
23. [ ] Integration tests for agents
24. [ ] E2E tests for critical flows
25. [ ] Error handling review
26. [ ] Performance optimization
```

---

## FILE TREE (Final)

```
claude-integration-gui/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts              # UPDATE: memory injection
│   │   ├── stock/
│   │   │   ├── [ticker]/
│   │   │   │   └── route.ts          # NEW: single stock data
│   │   │   └── batch/
│   │   │       └── route.ts          # NEW: batch stock data
│   │   ├── analyze/
│   │   │   └── route.ts              # NEW: deep analysis
│   │   ├── backtest/
│   │   │   └── route.ts              # NEW: run backtest
│   │   └── nordnet/                  # ✅ IMPLEMENTED
│   │       ├── status/route.ts       # API status check
│   │       ├── auth/route.ts         # Authentication
│   │       ├── accounts/route.ts     # Accounts list
│   │       ├── positions/route.ts    # Portfolio positions
│   │       └── instruments/route.ts  # Search instruments
│   │
│   ├── components/
│   │   ├── PortfolioPanel.tsx        # NEW
│   │   ├── PositionCard.tsx          # NEW
│   │   ├── AddPositionModal.tsx      # NEW
│   │   ├── MemoryPanel.tsx           # NEW
│   │   ├── MemoryExplorer.tsx        # NEW (graph viz)
│   │   ├── AgentDashboard.tsx        # NEW
│   │   ├── AlertsPanel.tsx           # NEW
│   │   ├── AnalysisView.tsx          # NEW
│   │   ├── BacktestPanel.tsx         # NEW
│   │   ├── PortfolioAnalytics.tsx    # NEW
│   │   ├── CodexPanel.tsx            # EXTRACT from page.tsx
│   │   ├── ModeSelector.tsx          # EXTRACT from page.tsx
│   │   └── ChatArea.tsx              # EXTRACT from page.tsx
│   │
│   ├── hooks/
│   │   ├── useMemory.ts              # NEW
│   │   ├── usePortfolio.ts           # NEW
│   │   ├── useAgents.ts              # NEW
│   │   ├── useStockData.ts           # NEW
│   │   └── useAnalysis.ts            # NEW
│   │
│   ├── lib/
│   │   ├── storage.ts                # NEW: IndexedDB wrapper
│   │   ├── memoryGraph.ts            # NEW
│   │   ├── agentRunner.ts            # NEW
│   │   ├── indicators.ts             # NEW
│   │   ├── patterns.ts               # NEW
│   │   ├── backtester.ts             # NEW
│   │   ├── portfolioAnalytics.ts     # NEW
│   │   ├── pushNotifications.ts      # NEW
│   │   └── nordnet/                  # ✅ IMPLEMENTED
│   │       ├── index.ts              # Main export
│   │       ├── client.ts             # API client
│   │       ├── feed.ts               # Real-time WebSocket
│   │       └── __tests__/            # Unit tests
│   │
│   ├── agents/
│   │   ├── priceMonitor.ts           # NEW
│   │   ├── signalHunter.ts           # NEW
│   │   ├── riskGuardian.ts           # NEW
│   │   ├── newsSentinel.ts           # NEW
│   │   ├── patternLearner.ts         # NEW
│   │   └── consolidator.ts           # NEW
│   │
│   ├── types/
│   │   ├── workflow.ts               # EXISTS
│   │   ├── memory.ts                 # NEW
│   │   ├── agents.ts                 # NEW
│   │   ├── analysis.ts               # NEW
│   │   └── portfolio.ts              # NEW
│   │
│   ├── config/
│   │   └── systemPrompts.ts          # UPDATE: new modes
│   │
│   ├── page.tsx                      # UPDATE: new layout
│   ├── layout.tsx                    # EXISTS
│   └── globals.css                   # EXISTS
│
├── public/
│   ├── manifest.json                 # NEW
│   ├── sw.js                         # NEW
│   └── icons/                        # NEW
│
├── CTIS_BUILD_SPEC.md                # THIS FILE
├── package.json                      # UPDATE: new deps
└── tsconfig.json                     # EXISTS
```

---

## DEPENDENCIES TO ADD

```json
{
  "dependencies": {
    "yahoo-finance2": "^2.11.0",
    "technicalindicators": "^3.1.0",
    "idb": "^8.0.0",
    "d3-force": "^3.0.0",
    "recharts": "^2.12.0",
    "date-fns": "^3.3.0"
  }
}
```

---

## MODULE 8: NORDNET BROKER INTEGRATION

### Purpose
Direct integration with Nordnet External API v2 for real portfolio data, live prices, and order management.

### Why Nordnet?
- User's primary broker (Sweden/Nordic)
- Official API available (v2)
- Real-time WebSocket feeds
- Eliminates manual position entry

### Implementation Status: ✅ IMPLEMENTED

Files created:
```
app/types/nordnet.ts           # Type definitions
app/lib/nordnet/client.ts      # API client with auth
app/lib/nordnet/feed.ts        # Real-time WebSocket feed
app/lib/nordnet/index.ts       # Main export
app/api/nordnet/status/        # Status check endpoint
app/api/nordnet/auth/          # Authentication endpoint
app/api/nordnet/accounts/      # Accounts endpoint
app/api/nordnet/positions/     # Positions endpoint
app/api/nordnet/instruments/   # Instruments search
docs/NORDNET_INTEGRATION.md    # Setup documentation
.env.example                   # Environment template
```

### Authentication Flow

```
1. Generate ed25519 SSH key pair
2. Upload PUBLIC key to Nordnet → receive API key
3. Configure environment variables:
   - NORDNET_API_KEY
   - NORDNET_COUNTRY (se|no|dk|fi)
   - NORDNET_PRIVATE_KEY_PATH

4. Authentication:
   POST /api/2/login/start { api_key }
   → { challenge: "uuid" }
   → Sign challenge with private key
   POST /api/2/login/verify { api_key, signature }
   → { session_key, expires_in: 1800 }
```

### Key Types

```typescript
interface NordnetPosition {
  accno: number;
  instrument: NordnetInstrument;
  qty: number;
  market_value: NordnetAmount;
  acq_price: NordnetAmount;  // Cost basis
}

interface NordnetPriceData {
  type: 'price';
  data: {
    m: number;      // market_id
    i: string;      // identifier
    bid: number;
    ask: number;
    last: number;
    high: number;
    low: number;
    volume: number;
  };
}
```

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/nordnet/status` | GET | Check API availability |
| `/api/nordnet/auth` | POST | Authenticate |
| `/api/nordnet/auth` | DELETE | Logout |
| `/api/nordnet/accounts` | GET | List accounts |
| `/api/nordnet/positions` | GET | Get portfolio positions |
| `/api/nordnet/instruments` | GET | Search instruments |

### Real-time Feed

```typescript
import { NordnetFeedClient, NORDNET_MARKETS } from './lib/nordnet';

const feed = new NordnetFeedClient(session, 'public', {
  onPrice: (price) => {
    console.log(`${price.i}: ${price.last}`);
  },
});

await feed.connect();
feed.subscribePrice(NORDNET_MARKETS.STOCKHOLM_LARGE_CAP, '101');
```

### Integration with CTIS

1. **Portfolio Panel**: Auto-sync positions from Nordnet
2. **Memory Graph**: Link Nordnet positions to memory nodes
3. **Price Monitor Agent**: Use Nordnet feed for Swedish stocks
4. **Trade Journal**: Import executed trades from Nordnet

### Configuration

```bash
# .env
NORDNET_API_KEY=your-api-key
NORDNET_COUNTRY=se
NORDNET_PRIVATE_KEY_PATH=/path/to/key
NORDNET_ENABLED=true
```

### Dependencies

```json
{
  "ws": "^8.16.0"  // For server-side WebSocket
}
```

---

## SUCCESS CRITERIA

### Functional Requirements
- [ ] Graph memory stores 6+ node types with relationships
- [ ] Memory persists across browser sessions (IndexedDB)
- [ ] Memory context injected into every Claude request
- [ ] 4+ autonomous agents running on intervals
- [ ] Real-time prices for any US stock ticker
- [ ] Technical indicators: RSI, MACD, SMA, EMA, Bollinger, ATR
- [ ] Pattern detection identifies at least 5 pattern types
- [ ] Backtesting produces Sharpe ratio, win rate, max drawdown
- [ ] Portfolio analytics shows correlation matrix
- [ ] Push notifications work on mobile
- [ ] Works offline with cached data
- [x] Nordnet API client with ed25519 authentication
- [x] Nordnet positions sync to portfolio panel
- [ ] Nordnet real-time feed integration
- [ ] Nordnet order placement (optional)

### Intelligence Requirements
- [ ] Claude references user's risk tolerance in recommendations
- [ ] Claude mentions past trades when analyzing same ticker
- [ ] System tracks win rate per signal type
- [ ] Agents proactively alert without user asking
- [ ] Memory shows trade → outcome → learned pattern chains

### Performance Requirements
- [ ] UI responds in < 100ms
- [ ] Stock data fetches in < 2s
- [ ] Agent runs complete in < 5s each
- [ ] Memory queries return in < 50ms

---

## FINAL NOTES

This is a 100x engineer project. Build it module by module. Test each piece before moving on.

When stuck:
1. Check the type definitions - they are your contract
2. Start with the simplest implementation that works
3. Add complexity only when needed
4. Write tests for anything that calculates numbers

Ship something that works. Then make it great.

**Current Date: January 30, 2026**
**Start building. Ask questions if blocked.**

---

*"The best time to plant a tree was 20 years ago. The second best time is now."*

Let's build something legendary.
