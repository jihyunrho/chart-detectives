import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  query, where, updateDoc, arrayUnion, onSnapshot 
} from 'firebase/firestore';
import { GameState, GameStatus, Role, MisleadingComponent, Annotation, User, Group } from '../types';

// !!! IMPORTANT: PASTE YOUR FIREBASE CONFIG HERE !!!
const firebaseConfig = {
  // Example:
  // apiKey: "AIzaSy...",
  // authDomain: "your-project.firebaseapp.com",
  // projectId: "your-project",
  // ...
};

// Initialize Firebase
let db: any;
try {
    if (Object.keys(firebaseConfig).length > 0) {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        console.log("Firebase initialized successfully");
    } else {
        console.error("Firebase config is empty! Please add your keys in services/gameService.ts");
    }
} catch (e) {
    console.error("Error initializing Firebase:", e);
}

// 1. Create a new game session (Container)
export const createGame = async (facilitatorEmail: string): Promise<string> => {
    if (!db) throw new Error("Firebase not connected. Check config.");
    
    const newGameId = Math.random().toString(36).substring(2, 9);
    
    const newGame: GameState = {
        id: newGameId,
        facilitatorEmail,
        detectiveEmails: [],
        groups: [] // Start with no groups
    };

    await setDoc(doc(db, "games", newGameId), newGame);
    return newGameId;
};

// 2. Find an existing active game for a user
export const findActiveGame = async (email: string): Promise<string | null> => {
    if (!db) return null;
    const gamesRef = collection(db, "games");
    
    try {
        // A. Is Facilitator?
        const q1 = query(gamesRef, where("facilitatorEmail", "==", email));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) return snap1.docs[0].id;

        // B. Is Detective? (Checks the global list of emails in the game doc)
        const q2 = query(gamesRef, where("detectiveEmails", "array-contains", email));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) return snap2.docs[0].id;
    } catch(e) {
        console.error("Error searching for game:", e);
    }
    return null;
};

// 3. Real-time Subscription
export const subscribeToGame = (gameId: string, callback: (game: GameState | null) => void) => {
    if (!db) return () => {};
    console.log("Subscribing to game:", gameId);
    return onSnapshot(doc(db, "games", gameId), (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data() as GameState);
        } else {
            callback(null);
        }
    });
};

// --- GROUP MANAGEMENT ---

export const createGroup = async (gameId: string, groupName: string) => {
    const newGroup: Group = {
        id: Date.now().toString(), // Simple ID
        name: groupName,
        detectives: [],
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: ''
    };
    await updateDoc(doc(db, "games", gameId), {
        groups: arrayUnion(newGroup)
    });
};

export const addDetectiveToGroup = async (
    gameId: string, 
    groupId: string,
    email: string, 
    assignedComponents: MisleadingComponent[],
    currentGame: GameState
) => {
    const newDetective: User = {
        email,
        role: Role.DETECTIVE,
        assignedComponents,
        trainingProgress: {},
        trainingAnswers: {}
    };

    // Update specific group
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            return { ...g, detectives: [...g.detectives, newDetective] };
        }
        return g;
    });

    // Also add to global detectiveEmails for lookup
    // Note: This logic assumes one detective is in only one group per game id.
    const updatedEmails = [...currentGame.detectiveEmails, email];

    await updateDoc(doc(db, "games", gameId), {
        groups: updatedGroups,
        detectiveEmails: updatedEmails
    });
};

// --- GROUP ACTIONS ---

export const updateGroupStatus = async (gameId: string, groupId: string, status: GameStatus, currentGame: GameState) => {
    const updatedGroups = currentGame.groups.map(g => 
        g.id === groupId ? { ...g, status } : g
    );
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};

export const updateDetectiveTraining = async (
    gameId: string, 
    groupId: string,
    email: string, 
    component: MisleadingComponent, 
    currentGame: GameState,
    answer: string
) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            const updatedDetectives = g.detectives.map(d => {
                if (d.email === email) {
                    return {
                        ...d,
                        trainingProgress: { ...d.trainingProgress, [component]: true },
                        trainingAnswers: { ...d.trainingAnswers, [component]: answer }
                    };
                }
                return d;
            });
            return { ...g, detectives: updatedDetectives };
        }
        return g;
    });
    
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};

export const addAnnotationToGroup = async (gameId: string, groupId: string, annotation: Annotation, currentGame: GameState) => {
    const updatedGroups = currentGame.groups.map(g => 
        g.id === groupId ? { ...g, annotations: [...g.annotations, annotation] } : g
    );
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};

export const updateGroupReport = async (
    gameId: string, 
    groupId: string, 
    report: string, 
    currentGame: GameState,
    evaluation?: any
) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            const updates: Partial<Group> = { inspectionReport: report };
            if (evaluation) {
                updates.evaluationResult = evaluation;
                updates.status = GameStatus.FINISHED;
            }
            return { ...g, ...updates };
        }
        return g;
    });
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};

// Reset a specific group (keep users, wipe progress)
export const resetGroupData = async (gameId: string, groupId: string, currentGame: GameState) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                status: GameStatus.SETUP,
                annotations: [],
                inspectionReport: '',
                evaluationResult: undefined,
                // Reset detective progress but keep them in the group
                detectives: g.detectives.map(d => ({
                    ...d,
                    trainingProgress: {},
                    trainingAnswers: {}
                }))
            };
        }
        return g;
    });
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};

// Reset entire game (wipe everything)
export const resetGameData = async (gameId: string, facilitatorEmail: string) => {
    const emptyGame: GameState = {
        id: gameId,
        facilitatorEmail,
        detectiveEmails: [], 
        groups: [] 
    };
    await setDoc(doc(db, "games", gameId), emptyGame);
};