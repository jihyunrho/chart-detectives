export enum Role {
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

export interface GameState {
  id: string;
  facilitatorEmail: string;
  detectives: User[];
  detectiveEmails: string[]; // Helper for easier Firestore queries
  status: GameStatus;
  annotations: Annotation[];
  inspectionReport: string;
  evaluationResult?: {
    success: boolean;
    feedback: string;
    score: number;
  };
}

export interface TrainingScenario {
  type: MisleadingComponent;
  title: string;
  description: string;
}