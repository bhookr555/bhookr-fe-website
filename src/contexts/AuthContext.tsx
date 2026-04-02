"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';
import { userRepository } from '@/lib/repositories';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper function to set auth cookie via API route (httpOnly)
  const setAuthCookie = async (user: User | null) => {
    try {
      if (user) {
        const token = await user.getIdToken();
        // Use API route to set httpOnly cookie
        await fetch('/api/auth/set-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } else {
        // Clear the cookie on sign out
        await fetch('/api/auth/clear-session', {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Error managing auth session:', error);
    }
  };

  useEffect(() => {
    // Set persistence when component mounts (client-side only)
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error('Error setting persistence:', error);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      // Set auth cookie for server-side authentication
      if (typeof window !== 'undefined') {
        await setAuthCookie(user);
      }
      
      // Create/update user document in Firestore
      if (user) {
        try {
          const exists = await userRepository.exists(user.uid);
          
          if (!exists) {
            // Create new user document
            await userRepository.create(user.uid, {
              email: user.email || '',
              name: user.displayName || '',
              image: user.photoURL || undefined,
              role: 'user',
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            // Update last login
            await userRepository.updateLastLogin(user.uid);
          }
        } catch (error) {
          console.error('Error updating user document:', error);
        }
      }
      
      setLoading(false);
    });

    // Refresh token every 50 minutes to keep session fresh
    const tokenRefreshInterval = setInterval(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await setAuthCookie(currentUser);
        } catch (error) {
          console.error('Error refreshing session:', error);
        }
      }
    }, 50 * 60 * 1000); // 50 minutes

    return () => {
      unsubscribe();
      clearInterval(tokenRefreshInterval);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(result.user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await userRepository.create(result.user.uid, {
        email: result.user.email || '',
        name: name,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

