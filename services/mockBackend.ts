import { GameState, GameStatus, Role, User, MisleadingComponent, Annotation } from '../types';

const STORAGE_KEY = 'chart_detectives_db';

// Helper to get all games
const getGames = (): GameState[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Helper to save games
const saveGames = (games: GameState[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
};

export const createGame = (facilitatorEmail: string): GameState => {
  const games = getGames();
  const newGame: GameState = {
    id: Math.random().toString(36).substring(2, 9),
    facilitatorEmail,
    detectives: [],
    detectiveEmails: [],
    status: GameStatus.SETUP,
    annotations: [],
    inspectionReport: '',
  };
  games.push(newGame);
  saveGames(games);
  return newGame;
};

export const getGameByEmail = (email: string): GameState | null => {
  const games = getGames();
  // Check if facilitator
  let game = games.find(g => g.facilitatorEmail === email);
  if (game) return game;
  
  // Check if detective
  game = games.find(g => g.detectives.some(d => d.email === email));
  return game || null;
};

export const updateGame = (gameId: string, updates: Partial<GameState>): GameState | null => {
  const games = getGames();
  const index = games.findIndex(g => g.id === gameId);
  if (index === -1) return null;

  games[index] = { ...games[index], ...updates };
  saveGames(games);
  return games[index];
};

export const resetGame = (gameId: string): GameState | null => {
    const games = getGames();
    const index = games.findIndex(g => g.id === gameId);
    if (index === -1) return null;

    // We keep the ID and the facilitator, but wipe everything else.
    // This allows the facilitator to stay "logged in" but effectively starts a new session.
    games[index] = {
        ...games[index],
        detectives: [], // Remove all players
        detectiveEmails: [],
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: '',
        evaluationResult: undefined
    };
    saveGames(games);
    return games[index];
};

export const addDetective = (gameId: string, email: string, assignedComponents: MisleadingComponent[]): GameState | null => {
  const games = getGames();
  const game = games.find(g => g.id === gameId);
  if (!game) return null;

  const newDetective: User = {
    email,
    role: Role.DETECTIVE,
    assignedComponents,
    trainingProgress: {}
  };

  game.detectives.push(newDetective);
  if (!game.detectiveEmails) {
    game.detectiveEmails = [];
  }
  game.detectiveEmails.push(email);
  
  saveGames(games);
  return game;
};

export const updateDetectiveProgress = (gameId: string, email: string, component: MisleadingComponent): GameState | null => {
  const games = getGames();
  const game = games.find(g => g.id === gameId);
  if (!game) return null;

  const detective = game.detectives.find(d => d.email === email);
  if (detective) {
    detective.trainingProgress = { ...detective.trainingProgress, [component]: true };
    saveGames(games);
  }
  return game;
};

export const addAnnotation = (gameId: string, annotation: Annotation): GameState | null => {
    const games = getGames();
    const game = games.find(g => g.id === gameId);
    if (!game) return null;

    game.annotations.push(annotation);
    saveGames(games);
    return game;
}