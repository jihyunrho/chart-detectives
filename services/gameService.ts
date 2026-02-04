import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  query, where, updateDoc, arrayUnion, onSnapshot 
} from 'firebase/firestore';
import { GameState, GameStatus, Role, MisleadingComponent, Annotation, User } from '../types';

// !!! IMPORTANT: PASTE YOUR FIREBASE CONFIG HERE !!!
const firebaseConfig = {
  apiKey: "AIzaSyDdC4PN53jc2-N6H_AptK_W4jcmSbziACo",

  authDomain: "graphdetective-32370.firebaseapp.com",

  projectId: "graphdetective-32370",

  storageBucket: "graphdetective-32370.firebasestorage.app",

  messagingSenderId: "999166751840",

  appId: "1:999166751840:web:a34d0797624df6cdbeff05",

  measurementId: "G-TCDWNGQHRP"

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

// 1. Create a new game
export const createGame = async (facilitatorEmail: string): Promise<string> => {
    if (!db) throw new Error("Firebase not connected. Check config.");
    
    // Check if user already has an active game to prevent zombies? 
    // For now, just make a new one.
    const newGameId = Math.random().toString(36).substring(2, 9);
    
    const newGame: GameState = {
        id: newGameId,
        facilitatorEmail,
        detectives: [],
        detectiveEmails: [],
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: '',
    };

    await setDoc(doc(db, "games", newGameId), newGame);
    return newGameId;
};

// 2. Find an existing active game for a user
export const findActiveGame = async (email: string): Promise<string | null> => {
    if (!db) return null;
    const gamesRef = collection(db, "games");

    // Strategy: Just check queries. 
    // Ideally, we'd store "activeGameId" in a "users" collection, but keeping it simple (stateless users).
    
    // A. Is Facilitator?
    try {
        const q1 = query(gamesRef, where("facilitatorEmail", "==", email));
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
            // Return the most recent created one if multiple? Just taking first for now.
            return snap1.docs[0].id;
        }

        // B. Is Detective?
        const q2 = query(gamesRef, where("detectiveEmails", "array-contains", email));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
            return snap2.docs[0].id;
        }
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
            console.warn("Game document disappeared");
            callback(null);
        }
    }, (error) => {
        console.error("Subscription error:", error);
    });
};

// 4. Game Actions
export const updateGameStatus = async (gameId: string, status: GameStatus) => {
    await updateDoc(doc(db, "games", gameId), { status });
};

export const addDetectiveToGame = async (gameId: string, email: string, assignedComponents: MisleadingComponent[]) => {
    const newDetective: User = {
        email,
        role: Role.DETECTIVE,
        assignedComponents,
        trainingProgress: {},
        trainingAnswers: {}
    };
    // Atomically add to array
    await updateDoc(doc(db, "games", gameId), {
        detectives: arrayUnion(newDetective),
        detectiveEmails: arrayUnion(email)
    });
};

export const updateDetectiveTraining = async (
    gameId: string, 
    email: string, 
    component: MisleadingComponent, 
    currentGame: GameState,
    answer: string
) => {
    // Firestore cannot easily update an object inside an array by query.
    // Read-Modify-Write pattern is safest for this simple app structure.
    const updatedDetectives = currentGame.detectives.map(d => {
        if (d.email === email) {
            return {
                ...d,
                trainingProgress: { ...d.trainingProgress, [component]: true },
                trainingAnswers: { ...d.trainingAnswers, [component]: answer }
            };
        }
        return d;
    });
    
    await updateDoc(doc(db, "games", gameId), { detectives: updatedDetectives });
};

export const addAnnotationToGame = async (gameId: string, annotation: Annotation) => {
    await updateDoc(doc(db, "games", gameId), {
        annotations: arrayUnion(annotation)
    });
};

export const updateGameReport = async (gameId: string, report: string, evaluation?: any) => {
    const updates: any = { inspectionReport: report };
    if (evaluation) {
        updates.evaluationResult = evaluation;
        updates.status = GameStatus.FINISHED;
    }
    await updateDoc(doc(db, "games", gameId), updates);
};

export const resetGameData = async (gameId: string, facilitatorEmail: string) => {
    const emptyGame: GameState = {
        id: gameId,
        facilitatorEmail,
        detectives: [],
        detectiveEmails: [], 
        status: GameStatus.SETUP,
        annotations: [],
        inspectionReport: '',
    };
    // Completely overwrite the document
    await setDoc(doc(db, "games", gameId), emptyGame);
};