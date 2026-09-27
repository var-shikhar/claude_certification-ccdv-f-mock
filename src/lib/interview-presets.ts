// Interview setup options, shared by the setup screen and the server prompts.

export const INTERVIEW_ROLES = [
  { id: 'frontend', label: 'Frontend engineer', topics: 'JavaScript and TypeScript, React or similar frameworks, browser performance, accessibility, state management, CSS layout' },
  { id: 'backend', label: 'Backend engineer', topics: 'API design, databases and indexing, caching, concurrency, queues, reliability and observability' },
  { id: 'fullstack', label: 'Full-stack engineer', topics: 'end-to-end feature design, REST/GraphQL APIs, data modelling, frontend architecture, deployment' },
  { id: 'ai-engineer', label: 'AI / LLM engineer', topics: 'prompt and context engineering, tool use and agents, RAG, evaluation, cost and latency trade-offs, safety' },
  { id: 'devops', label: 'DevOps / platform engineer', topics: 'CI/CD, containers and orchestration, infrastructure as code, monitoring, incident response' },
  { id: 'data-scientist', label: 'Data scientist', topics: 'statistics, experiment design, feature engineering, model evaluation, communicating results' },
  { id: 'product-manager', label: 'Product manager', topics: 'prioritisation, metrics, discovery, stakeholder management, roadmap trade-offs' },
] as const;

export const INTERVIEW_LEVELS = [
  { id: 'junior', label: 'Junior', blurb: '0–2 years' },
  { id: 'mid', label: 'Mid-level', blurb: '2–5 years' },
  { id: 'senior', label: 'Senior', blurb: '5+ years' },
] as const;

export const INTERVIEW_FOCUS = [
  { id: 'technical', label: 'Technical', blurb: 'Concepts, trade-offs and problem solving' },
  { id: 'behavioral', label: 'Behavioural', blurb: 'Past experience, told with STAR' },
  { id: 'mixed', label: 'Mixed', blurb: 'A bit of both, like a real loop' },
] as const;

export const INTERVIEW_LENGTHS = [3, 5, 8] as const;

export type InterviewRoleId = (typeof INTERVIEW_ROLES)[number]['id'];
export type InterviewLevelId = (typeof INTERVIEW_LEVELS)[number]['id'];
export type InterviewFocusId = (typeof INTERVIEW_FOCUS)[number]['id'];

export const RUBRICS: Record<InterviewFocusId, string[]> = {
  technical: ['Technical accuracy', 'Depth and trade-offs', 'Problem solving', 'Communication'],
  behavioral: ['Structure (STAR)', 'Impact and ownership', 'Self-awareness', 'Communication'],
  mixed: ['Technical accuracy', 'Problem solving', 'Structure and clarity', 'Communication'],
};

export const roleLabel = (id: string) => INTERVIEW_ROLES.find((r) => r.id === id)?.label ?? id;
export const levelLabel = (id: string) => INTERVIEW_LEVELS.find((l) => l.id === id)?.label ?? id;
export const focusLabel = (id: string) => INTERVIEW_FOCUS.find((f) => f.id === id)?.label ?? id;
