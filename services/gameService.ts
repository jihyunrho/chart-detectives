import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  query, where, updateDoc, arrayUnion, onSnapshot 
} from 'firebase/firestore';
import { GameState, GameStatus, Role, MisleadingComponent, Annotation, User, Group, RoundHistory } from '../types';

// Use environment variables for Firebase configuration
// Ensure you have a .env file with these keys starting with VITE_
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- HELPER: Random Issue Generator ---
// MODIFIED FOR TESTING: Accepts caseIndex to force specific issues
const generateCaseIssues = (detectives: User[], caseIndex: number = 0): MisleadingComponent[] => {
    // 1. Get all components assigned to detectives (The Training Set)
    const assignedSet = new Set<MisleadingComponent>();
    detectives.forEach(d => {
        d.assignedComponents?.forEach(c => assignedSet.add(c));
    });

    // 2. Get the pool of components NOT assigned
    // const allComponents = Object.values(MisleadingComponent);
    // const unassigned = allComponents.filter(c => !assignedSet.has(c));

    // 3. TESTING LOGIC: Force specific components per case
    const extraPicks: MisleadingComponent[] = [];

    if (caseIndex === 0) {
        // Case 1: Add Misleading Annotations
        extraPicks.push(MisleadingComponent.MISLEADING_ANNOTATION);
    } else if (caseIndex === 1) {
        // Case 2: Add Inappropriate Order
        extraPicks.push(MisleadingComponent.INAPPROPRIATE_ORDER);
    }

    /* ORIGINAL LOGIC COMMENTED OUT
    const randomPicks: MisleadingComponent[] = [];
    if (unassigned.length > 0) {
        const idx = Math.floor(Math.random() * unassigned.length);
        randomPicks.push(unassigned[idx]);
    }
    */

    // 4. Combine Assigned + Extras
    const finalIssues = Array.from(new Set([...Array.from(assignedSet), ...extraPicks]));
    return finalIssues;
};


// 1. Create a new game session (Container)
export const createGame = async (facilitatorEmail: string): Promise<string> => {
    const newGameId = Math.random().toString(36).substring(2, 9);
    
    const newGame: GameState = {
        id: newGameId,
        facilitatorEmail,
        detectiveEmails: [],
        groups: [] 
    };

    await setDoc(doc(db, "games", newGameId), newGame);
    return newGameId;
};

// 2. Find an existing active game for a user
export const findActiveGame = async (email: string): Promise<string | null> => {
    const gamesRef = collection(db, "games");
    try {
        // A. Is Facilitator?
        const q1 = query(gamesRef, where("facilitatorEmail", "==", email));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) return snap1.docs[0].id;

        // B. Is Detective?
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
    return onSnapshot(doc(db, "games", gameId), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // NORMALIZE DATA: Ensure Arrays exist even if Firestore data is old/sparse
            const safeGame: GameState = {
                id: data.id,
                facilitatorEmail: data.facilitatorEmail,
                detectiveEmails: data.detectiveEmails || [],
                groups: (data.groups || []).map((g: any) => ({
                    ...g,
                    // Ensure new fields exist for backward compatibility
                    currentCaseIndex: g.currentCaseIndex || 0,
                    roundHistory: g.roundHistory || [],
                    currentCaseTargetIssues: g.currentCaseTargetIssues || [] 
                }))
            };
            callback(safeGame);
        } else {
            callback(null);
        }
    });
};

// --- GROUP MANAGEMENT ---

export const createGroup = async (gameId: string, groupName: string) => {
    const newGroup: Group = {
        id: Date.now().toString(),
        name: groupName,
        detectives: [],
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: '',
        currentCaseIndex: 0,
        roundHistory: []
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

    // Update the specific group in the local array, then push the whole array
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            return { ...g, detectives: [...g.detectives, newDetective] };
        }
        return g;
    });

    // Also update the top-level detective list for easier searching
    const updatedEmails = [...(currentGame.detectiveEmails || []), email];
    // Remove duplicates just in case
    const uniqueEmails = Array.from(new Set(updatedEmails));

    await updateDoc(doc(db, "games", gameId), {
        groups: updatedGroups,
        detectiveEmails: uniqueEmails
    });
};

// --- GROUP ACTIONS ---

export const updateGroupStatus = async (gameId: string, groupId: string, status: GameStatus, currentGame: GameState) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
             const updates: Partial<Group> = { status };
             // If activating (Moving to Case 1), generate the issues for the first case (Index 0)
             if (status === GameStatus.ACTIVE && g.status === GameStatus.SETUP) {
                 updates.currentCaseTargetIssues = generateCaseIssues(g.detectives, 0);
             }
             return { ...g, ...updates };
        }
        return g;
    });
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

export const resetGroupData = async (gameId: string, groupId: string, currentGame: GameState) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            // Destructure to remove evaluationResult from the base object
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { evaluationResult, currentCaseTargetIssues, ...rest } = g;
            
            return {
                ...rest,
                status: GameStatus.SETUP,
                annotations: [],
                inspectionReport: '',
                currentCaseIndex: 0,
                roundHistory: [],
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

export const resetGameData = async (gameId: string, facilitatorEmail: string) => {
    const emptyGame: GameState = {
        id: gameId,
        facilitatorEmail,
        detectiveEmails: [], 
        groups: [] 
    };
    await setDoc(doc(db, "games", gameId), emptyGame);
};

// NEW: Advance to the next round
export const advanceToNextRound = async (
    gameId: string, 
    groupId: string, 
    caseTitle: string,
    currentGame: GameState
) => {
    const updatedGroups = currentGame.groups.map(g => {
        if (g.id === groupId) {
            // Archive current round
            // Safe guard against undefined evaluationResult to prevent Firestore error in historyEntry
            const evalResult = g.evaluationResult || { success: false, feedback: "Evaluation Missing", score: 0 };
            
            const historyEntry: RoundHistory = {
                caseIndex: g.currentCaseIndex,
                caseTitle: caseTitle,
                annotations: [...g.annotations],
                inspectionReport: g.inspectionReport || "",
                targetIssues: g.currentCaseTargetIssues || [], // Save what was active!
                evaluationResult: evalResult
            };

            // Destructure to remove evaluationResult from the new state to clean up for next round
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { evaluationResult, ...rest } = g;
            
            const nextIndex = g.currentCaseIndex + 1;
            // Generate NEW mixed issues for the next round
            const nextIssues = generateCaseIssues(g.detectives, nextIndex);

            return {
                ...rest,
                status: GameStatus.ACTIVE, // Resume action
                currentCaseIndex: nextIndex,
                currentCaseTargetIssues: nextIssues,
                roundHistory: [...(g.roundHistory || []), historyEntry],
                // Reset session data for new round
                annotations: [],
                inspectionReport: '',
            };
        }
        return g;
    });
    await updateDoc(doc(db, "games", gameId), { groups: updatedGroups });
};