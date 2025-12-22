
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: (useRedirect?: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// PWA detection helper
const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log("[AuthContext] Setting up auth state listener");
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            console.log("[AuthContext] Auth state changed:", currentUser ? `User: ${currentUser.uid}` : "No user");
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async (useRedirect = false) => {
        try {
            console.log("[AuthContext] signInWithGoogle called", { useRedirect, isMobile: isMobile() });
            if (useRedirect || isMobile()) {
                console.log("[AuthContext] Using redirect...");
                await signInWithRedirect(auth, googleProvider);
            } else {
                console.log("[AuthContext] Using popup...");
                const result = await signInWithPopup(auth, googleProvider);
                console.log("[AuthContext] Popup success. User:", result.user?.uid);
            }
        } catch (error) {
            console.error("[AuthContext] Login failed", error);
            throw error;
        }
    };

    const logout = () => signOut(auth);

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
