// Workflow Mode Types for Claude Code Architect + Builder

export type WorkflowMode =
  | 'planning'
  | 'code'
  | 'debug'
  | 'test'
  | 'optimize'
  | 'deploy'
  | 'codex';

export type WorkflowPhase = 'planning' | 'building';

export interface ModeConfig {
  id: WorkflowMode;
  name: string;
  icon: string;
  description: string;
  phase: WorkflowPhase;
  shortcut: string;
}

export interface CodexEntry {
  id: string;
  category: string;
  title: string;
  version: string;
  description: string;
  code: string;
  language: string;
  usage: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkflowState {
  currentMode: WorkflowMode;
  currentPhase: WorkflowPhase;
  messages: Message[];
  codexEntries: CodexEntry[];
}

export const MODES: ModeConfig[] = [
  {
    id: 'planning',
    name: 'Planning',
    icon: '📋',
    description: 'Architecture, pseudocode, roadmaps - mobile-friendly',
    phase: 'planning',
    shortcut: '1',
  },
  {
    id: 'code',
    name: 'Code',
    icon: '💻',
    description: 'Generate modules, full scripts, refinements',
    phase: 'building',
    shortcut: '2',
  },
  {
    id: 'debug',
    name: 'Debug',
    icon: '🔍',
    description: 'Find & fix bugs in provided code',
    phase: 'building',
    shortcut: '3',
  },
  {
    id: 'test',
    name: 'Test',
    icon: '🧪',
    description: 'Write pytest/unittest suites + mocks',
    phase: 'building',
    shortcut: '4',
  },
  {
    id: 'optimize',
    name: 'Optimize',
    icon: '⚡',
    description: 'Performance, async, memory, latency improvements',
    phase: 'building',
    shortcut: '5',
  },
  {
    id: 'deploy',
    name: 'Deploy',
    icon: '🚀',
    description: 'systemd, docker, cron, nohup patterns for Linux',
    phase: 'building',
    shortcut: '6',
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: '📚',
    description: 'Persistent reusable snippet library',
    phase: 'building',
    shortcut: '7',
  },
];

export const getModeById = (id: WorkflowMode): ModeConfig | undefined =>
  MODES.find(mode => mode.id === id);

export const getModesByPhase = (phase: WorkflowPhase): ModeConfig[] =>
  MODES.filter(mode => mode.phase === phase);
