import {
    collection,
    doc,
    setDoc,
    getDocs,
    writeBatch,
    query,
    where,
    orderBy,
    Timestamp,
    getDoc,
    deleteDoc
} from "firebase/firestore";
import { db } from "./firebase";
import { ProcessingResult, ProviderConfig } from "../types";

// DB Interfaces based on Implementation Plan
export interface SessionMetadata {
    id: string;
    userId: string;
    createdAt: Timestamp;
    patientId?: string;
    previewSummary: string;
    status: 'draft' | 'completed';
}

export interface SessionData {
    transcript: {
        text: string;
        segments: any[];
    };
    fullSummary: string;
    entities: any[];
    reports: any[];
    audioUrl?: string;
}

export interface UserProfile {
    uid: string;
    settings: ProviderConfig;
}

const USERS_COLLECTION = 'users';
const SESSIONS_COLLECTION = 'sessions';
const SESSION_DATA_COLLECTION = 'session_data';

export const dbService = {
    /**
     * Saves a session using a batch write to split metadata and heavy data
     */
    saveSession: async (
        userId: string,
        result: ProcessingResult,
        status: 'draft' | 'completed' = 'completed',
        audioUrl?: string,
        customId?: string
    ) => {
        const batch = writeBatch(db);
        const sessionId = customId || crypto.randomUUID();
        const now = Timestamp.now();

        // 1. Create Session Metadata (Lightweight)
        const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
        const metadata: SessionMetadata = {
            id: sessionId,
            userId,
            createdAt: now,
            status,
            previewSummary: result.summary.slice(0, 200) + (result.summary.length > 200 ? '...' : ''),
            // Try to find patient ID in entities if available, otherwise undefined
            patientId: result.entities.find(e => e.category === 'PII' && (e.text.match(/\d{9,10}/) || e.text.toLowerCase().includes('rč')))?.text
        };
        batch.set(sessionRef, metadata);

        // 2. Create Session Data (Heavy)
        const dataRef = doc(db, SESSION_DATA_COLLECTION, sessionId);
        const fullData: SessionData = {
            transcript: {
                text: result.rawTranscript,
                segments: result.segments
            },
            fullSummary: result.summary,
            entities: result.entities,
            reports: result.reports,
            audioUrl
        };
        batch.set(dataRef, fullData);

        await batch.commit();
        return sessionId;
    },

    /**
     * Retrieves list of sessions for the current user
     */
    getUserSessions: async (userId: string) => {
        const q = query(
            collection(db, SESSIONS_COLLECTION),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SessionMetadata);
    },

    /**
     * Retrieves full data for a specific session
     */
    getSessionData: async (sessionId: string) => {
        const dataRef = doc(db, SESSION_DATA_COLLECTION, sessionId);
        const snapshot = await getDoc(dataRef);
        return snapshot.exists() ? snapshot.data() as SessionData : null;
    },

    /**
     * Saves user settings
     */
    saveUserSettings: async (userId: string, config: ProviderConfig) => {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await setDoc(userRef, {
            uid: userId,
            settings: config,
            updatedAt: Timestamp.now()
        }, { merge: true });
    },

    /**
     * Gets user settings
     */
    getUserSettings: async (userId: string): Promise<ProviderConfig | null> => {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return (snapshot.data() as UserProfile).settings;
        }
        return null;
    },

    /**
     * Deletes a session and its data
     */
    deleteSession: async (sessionId: string) => {
        const batch = writeBatch(db);

        const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
        batch.delete(sessionRef);

        const dataRef = doc(db, SESSION_DATA_COLLECTION, sessionId);
        batch.delete(dataRef);

        await batch.commit();
    }
};
