=export enum Role {
  FACILITATOR = 'FACILITATOR',
  DETECTIVE = 'DETECTIVE',
}

export enum MisleadingComponent {
  INVERTED_Y = 'Inverted Y-Axis',
  TRUNCATED_Y = 'Truncated Y-Axis',
  IRREGULAR_X = 'Irregular Time Interval',
  AGGREGATED = 'Inappropriately Aggregated Data',
}

export enum GameStatus {
  SETUP = 'SETUP',
  TRAINING = 'TRAINING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  TERMINATED = 'TERMINATED', // New status for forced end
}

export interface User {
  email: string;
  role: Role;
  assignedComponents?: MisleadingComponent[]; // For detectives
  trainingProgress?: {
    [key in MisleadingComponent]?: boolean; // true if completed
  };
  trainingAnswers?: {
    [key in MisleadingComponent]?: string; // Stored user answers
  };
}

export interface Annotation {
  id: string;
  x: number; // Percentage relative to container
  y: number; // Percentage relative to container
  authorEmail: string;
  reason: string;
  impact: string;
  timestamp: number;
}

// New Interface: Represents a single team/group within the session
export interface Group {
    id: string;
    name: string;
    detectives: User[];
    status: GameStatus;
    annotations: Annotation[];
    inspectionReport: string;
    evaluationResult?: {
        success: boolean;
        feedback: string;
        score: number;
    };
}

// Refactored GameState: Acts as a container for multiple groups
export interface GameState {
  id: string;
  facilitatorEmail: string;
  detectiveEmails: string[]; // Keep top-level for easy lookup (contains emails from ALL groups)
  groups: Group[]; // Array of groups
}

export interface TrainingScenario {
  type: MisleadingComponent;
  title: string;
  description: string;
}