export enum Role {
  FACILITATOR = 'FACILITATOR',
  DETECTIVE = 'DETECTIVE',
}

export enum MisleadingComponent {
  INAPPROPRIATE_ORDER = 'Inappropriate Order',
  INAPPROPRIATE_SCALE_RANGE = 'Inappropriate Scale Range',
  INAPPROPRIATE_SCALE_FUNC = 'Inappropriate Scale Function',
  UNCONVENTIONAL_SCALE_DIR = 'Unconventional Scale Directions',
  MISSING_NORMALIZATION = 'Missing Normalization',
  INAPPROPRIATE_AGGREGATION = 'Inappropriate Aggregation',
  CHERRY_PICKING = 'Cherry Picking',
  MISLEADING_ANNOTATION = 'Misleading Annotations',
}

export enum GameStatus {
  SETUP = 'SETUP',
  TRAINING = 'TRAINING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  TERMINATED = 'TERMINATED', 
}

export interface User {
  email: string;
  role: Role;
  assignedComponents?: MisleadingComponent[]; 
  trainingProgress?: {
    [key in MisleadingComponent]?: boolean; 
  };
  trainingAnswers?: {
    [key in MisleadingComponent]?: string; 
  };
}

export interface Annotation {
  id: string;
  x: number; 
  y: number; 
  authorEmail: string;
  reason: string;
  impact: string;
  timestamp: number;
}

// Stores the result of a completed round
export interface RoundHistory {
    caseIndex: number;
    caseTitle: string;
    annotations: Annotation[];
    inspectionReport: string;
    targetIssues: MisleadingComponent[]; // Record what was active for this specific round
    evaluationResult: {
        success: boolean;
        feedback: string;
        score: number;
        detectedIssues?: string[];
    };
}

export interface Group {
    id: string;
    name: string;
    detectives: User[];
    status: GameStatus;
    
    // Current Round Data
    currentCaseIndex: number; // 0-based index tracking progress
    currentCaseTargetIssues?: MisleadingComponent[]; // The active "Answer Key" for this round
    annotations: Annotation[];
    inspectionReport: string;
    evaluationResult?: {
        success: boolean;
        feedback: string;
        score: number;
        detectedIssues?: string[];
    };

    // History of previous rounds
    roundHistory: RoundHistory[];
}

export interface GameState {
  id: string;
  facilitatorEmail: string;
  detectiveEmails: string[]; 
  groups: Group[]; 
}

export interface TrainingScenario {
  type: MisleadingComponent;
  title: string;
  description: string;
}

// Definition for a Game Level
export interface CaseScenario {
    id: string;
    title: string;
    description: string;
    persuasiveReport: string; // The "Argument" trying to be made
    chartType: 'CASE_POLICY' | 'CASE_MARKETING';
    // targetIssues removed from here, as they are now dynamic per group
}