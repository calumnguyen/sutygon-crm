'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '@/types/user';

interface UserContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  reloadUser: () => void;
  sessionToken: string | null;
  setSessionToken: (token: string | null) => void;
  showSessionWarning: boolean;
  sessionWarningSeconds: number;
  extendSession: () => void;
  dismissSessionWarning: () => void;
  setImportantTask: (isImportant: boolean) => void;
  isWorkingOnImportantTask: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [justLoggedIn, setJustLoggedIn] = useState(false); // Track fresh login
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const [sessionWarningSeconds, setSessionWarningSeconds] = useState(0);
  const [isWorkingOnImportantTask, setIsWorkingOnImportantTask] = useState(false); // Track if user is in critical operation

  // Inactivity timeout (3 minutes)
  const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
  const WARNING_THRESHOLD = 2 * 60 * 1000; // Show warning at 2 minutes (1 minute left)

  const validateSessionWithServer = async (token: string): Promise<User | null> => {
    try {
      const res = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      });

      if (res.ok) {
        const data = await res.json();

        // Use the original employee key stored during login
        const originalEmployeeKey = localStorage.getItem('originalEmployeeKey');
        const validatedUser = {
          ...data.user,
          employeeKey: originalEmployeeKey || data.user.employeeKey,
        };

        return validatedUser;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Session validation failed:', error);
      return null;
    }
  };

  // Enhanced session validation with retry logic
  const validateSessionWithRetry = async (token: string, retries = 2): Promise<User | null> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const user = await validateSessionWithServer(token);
        if (user) {
          return user;
        }

        // If this is not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
        }
      } catch (error) {
        console.error(`Session validation attempt ${attempt + 1} failed:`, error);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    return null;
  };

  // Custom setters that track login state
  const setCurrentUserWithLogin = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      setJustLoggedIn(true);
      setLastActivity(Date.now()); // Reset activity timer on login
      setShowSessionWarning(false); // Clear any existing warning
      setSessionWarningSeconds(0); // Reset warning countdown
      // Reset flag after a short delay
      setTimeout(() => setJustLoggedIn(false), 2000);
    }
  };

  const setSessionTokenWithLogin = (token: string | null) => {
    setSessionToken(token);
  };

  // Track user activity (clicks, keyboard, mouse movement)
  const trackActivity = () => {
    setLastActivity(Date.now());
  };

  // Activity tracking effect
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    // Add activity event listeners
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'click', // Desktop/laptop events
      'touchstart',
      'touchmove',
      'touchend', // Mobile touch events
      'wheel',
      'keydown',
      'keyup', // Additional input events
      'focus',
      'resize', // Window/app interaction events
    ];

    events.forEach((event) => {
      document.addEventListener(event, trackActivity, true);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, [currentUser, sessionToken]);

  // Inactivity timer effect
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
        console.log('⏰ Session expired due to inactivity');
        setShowSessionWarning(false);
        logout();
      } else if (timeSinceLastActivity >= WARNING_THRESHOLD && !showSessionWarning) {
        // Show warning when 2 minutes of inactivity (1 minute left)
        const remainingSeconds = Math.ceil((INACTIVITY_TIMEOUT - timeSinceLastActivity) / 1000);
        console.log(
          `⚠️ SHOWING WARNING - Time since activity: ${timeSinceLastActivity}ms, Remaining: ${remainingSeconds}s`
        );
        setSessionWarningSeconds(remainingSeconds);
        setShowSessionWarning(true);
      } else if (showSessionWarning && timeSinceLastActivity < WARNING_THRESHOLD) {
        // Hide warning if user becomes active again before timeout
        console.log('✅ User became active again, hiding warning');
        setShowSessionWarning(false);
        setSessionWarningSeconds(0);
      }
    };

    // Check every 10 seconds for efficient monitoring
    const interval = setInterval(checkInactivity, 10000);

    return () => clearInterval(interval);
  }, [currentUser, sessionToken, lastActivity, showSessionWarning]);

  const loadSessionFromStorage = async () => {
    const storedToken = localStorage.getItem('sessionToken');
    const storedKey = localStorage.getItem('originalEmployeeKey');

    if (storedToken) {
      const user = await validateSessionWithRetry(storedToken);
      if (user) {
        // Ensure we have the original employee key
        const userWithKey = {
          ...user,
          employeeKey: storedKey || user.employeeKey,
        };
        setCurrentUser(userWithKey);
        setSessionToken(storedToken);
        setLastActivity(Date.now()); // Reset activity timer for existing session
      } else {
        // Invalid session, clear storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('originalEmployeeKey');
        setCurrentUser(null);
        setSessionToken(null);
      }
    } else {
      setCurrentUser(null);
      setSessionToken(null);
    }
  };

  useEffect(() => {
    // Check if this is a fresh browser session (hard refresh, new tab, etc.)
    const browserSessionId = sessionStorage.getItem('browserSessionId');
    const hasStoredTokens = localStorage.getItem('sessionToken');

    if (hasStoredTokens && !browserSessionId) {
      // We have stored tokens but no browser session ID = fresh page load
      console.log('🔄 Hard refresh detected - clearing session for security');
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('originalEmployeeKey');
      setCurrentUser(null);
      setSessionToken(null);
    }

    // Set/refresh browser session ID (clears on hard refresh)
    sessionStorage.setItem('browserSessionId', Date.now().toString());

    // Load session if available
    loadSessionFromStorage();

    // Listen for storage changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sessionToken') {
        loadSessionFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Session validation polling (every 5 minutes)
  useEffect(() => {
    if (!sessionToken) return;

    const validateCurrentSession = async () => {
      // Don't validate if user is actively working (within last 30 seconds)
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity < 30000) {
        console.log('Skipping session validation - user is actively working');
        return;
      }

      // Don't validate if user is working on important task
      if (isWorkingOnImportantTask) {
        console.log('Skipping session validation - user is working on important task');
        return;
      }

      const user = await validateSessionWithRetry(sessionToken);
      if (!user) {
        // Session is invalid, logout
        logout();
      } else {
        // Update user data (but preserve employeeKey from login)
        setCurrentUser(user);
        setLastActivity(Date.now()); // Reset activity timer on successful validation
      }
    };

    // Skip immediate validation if we just logged in (preserve login data)
    if (justLoggedIn) {
      // Skip validation to preserve login data
    } else {
      // Validate immediately for existing sessions
      validateCurrentSession();
    }

    // Always set up interval for periodic validation (after 5 minutes)
    const interval = setInterval(validateCurrentSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessionToken, justLoggedIn, lastActivity]);

  // Store status polling for auto-logout (reduced frequency since we have real sessions now)
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const checkStoreStatus = async () => {
      try {
        const res = await fetch('/api/store/status');
        const data = await res.json();

        // If store is closed and user is not admin, check if session is still valid
        // The server-side invalidation should handle this, but this is a backup
        if (!data.isOpen && currentUser.role !== 'admin') {
          // Don't validate if user is actively working (within last 30 seconds)
          const timeSinceLastActivity = Date.now() - lastActivity;
          if (timeSinceLastActivity < 30000) {
            console.log('Skipping store status validation - user is actively working');
            return;
          }

          // Don't validate if user is working on important task
          if (isWorkingOnImportantTask) {
            console.log('Skipping store status validation - user is working on important task');
            return;
          }

          const user = await validateSessionWithRetry(sessionToken);
          if (!user) {
            console.log('Store closed - session invalidated by server');
            logout();
          }
        }
      } catch (error) {
        console.error('Failed to check store status:', error);
      }
    };

    // Check every 2 minutes instead of 60 seconds to reduce load
    const interval = setInterval(checkStoreStatus, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser, sessionToken, lastActivity]);

  const logout = async () => {
    if (sessionToken) {
      try {
        // Call logout API to invalidate session on server
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken }),
        });
      } catch (error) {
        console.error('Failed to logout on server:', error);
      }
    }

    // Clear client-side state regardless of API success
    setCurrentUser(null);
    setSessionToken(null);
    setShowSessionWarning(false);
    setSessionWarningSeconds(0);
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('originalEmployeeKey');
  };

  const reloadUser = () => {
    loadSessionFromStorage();
  };

  const extendSession = () => {
    setLastActivity(Date.now());
    setShowSessionWarning(false);
    console.log('🔄 Session extended by user action');
  };

  const dismissSessionWarning = () => {
    setShowSessionWarning(false);
  };

  const setImportantTask = (isImportant: boolean) => {
    setIsWorkingOnImportantTask(isImportant);
    if (isImportant) {
      console.log('🔒 User started important task - session validation paused');
    } else {
      console.log('🔓 User finished important task - session validation resumed');
    }
  };

  const value: UserContextType = {
    currentUser,
    isAuthenticated: currentUser !== null && sessionToken !== null,
    userRole: currentUser?.role || null,
    setCurrentUser: setCurrentUserWithLogin,
    logout,
    reloadUser,
    sessionToken,
    setSessionToken: setSessionTokenWithLogin,
    showSessionWarning,
    sessionWarningSeconds,
    extendSession,
    dismissSessionWarning,
    setImportantTask,
    isWorkingOnImportantTask,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
