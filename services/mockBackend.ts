import { GameState, GameStatus, Role, User, MisleadingComponent, Annotation, Group } from '../types';

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
    detectiveEmails: [],
    groups: []
  };
  games.push(newGame);
  saveGames(games);
  return newGame;
};

export const createGroup = (gameId: string, groupName: string): GameState | null => {
    const games = getGames();
    const game = games.find(g => g.id === gameId);
    if (!game) return null;

    const newGroup: Group = {
        id: Math.random().toString(36).substring(2, 9),
        name: groupName,
        detectives: [],
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: ''
    };
    game.groups.push(newGroup);
    saveGames(games);
    return game;
};

export const getGameByEmail = (email: string): GameState | null => {
  const games = getGames();
  // Check if facilitator
  let game = games.find(g => g.facilitatorEmail === email);
  if (game) return game;
  
  // Check if detective
  game = games.find(g => g.detectiveEmails && g.detectiveEmails.includes(email));
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
        detectiveEmails: [],
        groups: []
    };
    saveGames(games);
    return games[index];
};

export const addDetective = (gameId: string, groupId: string, email: string, assignedComponents: MisleadingComponent[]): GameState | null => {
  const games = getGames();
  const game = games.find(g => g.id === gameId);
  if (!game) return null;

  const group = game.groups.find(g => g.id === groupId);
  if (!group) return null;

  const newDetective: User = {
    email,
    role: Role.DETECTIVE,
    assignedComponents,
    trainingProgress: {}
  };

  group.detectives.push(newDetective);
  if (!game.detectiveEmails) game.detectiveEmails = [];
  if (!game.detectiveEmails.includes(email)) {
    game.detectiveEmails.push(email);
  }
  
  saveGames(games);
  return game;
};

export const updateDetectiveProgress = (gameId: string, email: string, component: MisleadingComponent): GameState | null => {
  const games = getGames();
  const game = games.find(g => g.id === gameId);
  if (!game) return null;

  for (const group of game.groups) {
      const detective = group.detectives.find(d => d.email === email);
      if (detective) {
        detective.trainingProgress = { ...detective.trainingProgress, [component]: true };
        saveGames(games);
        break;
      }
  }
  return game;
};

export const addAnnotation = (gameId: string, groupId: string, annotation: Annotation): GameState | null => {
    const games = getGames();
    const game = games.find(g => g.id === gameId);
    if (!game) return null;

    const group = game.groups.find(g => g.id === groupId);
    if (group) {
        group.annotations.push(annotation);
        saveGames(games);
    }
    return game;
}