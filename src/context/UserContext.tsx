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
  const [hasValidatedSession, setHasValidatedSession] = useState(false); // Track if session has been validated this cycle

  // Inactivity timeout (3 minutes)
  const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes in milliseconds
  const WARNING_THRESHOLD = 2 * 60 * 1000; // Show warning at 2 minutes (1 minute left)

  const validateSessionWithServer = async (token: string): Promise<User | null> => {
    const requestId = `client-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`[${requestId}] 🔐 Client-side session validation started`);

    try {
      console.log(`[${requestId}] 🚀 Sending session validation request...`);
      const res = await fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken: token }),
      });

      console.log(`[${requestId}] 📡 Session validation response:`, {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        timestamp: new Date().toISOString(),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[${requestId}] ✅ Session validation successful:`, {
          userId: data.user?.id,
          userName: data.user?.name,
          userRole: data.user?.role,
          timestamp: new Date().toISOString(),
        });

        // Use the original employee key stored during login
        const originalEmployeeKey = localStorage.getItem('originalEmployeeKey');
        const validatedUser = {
          ...data.user,
          employeeKey: originalEmployeeKey || data.user.employeeKey,
        };

        const duration = Date.now() - startTime;
        console.log(
          `[${requestId}] ✅ Client-side session validation completed successfully in ${duration}ms`,
          {
            userId: validatedUser.id,
            duration,
            timestamp: new Date().toISOString(),
          }
        );

        return validatedUser;
      } else {
        console.warn(`[${requestId}] ⚠️ Session validation failed with status:`, res.status);
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ❌ Client-side session validation failed after ${duration}ms:`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          duration,
          timestamp: new Date().toISOString(),
        }
      );
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
          const waitTime = Math.pow(2, attempt + 1) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`Session validation failed, retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        console.error(`Session validation attempt ${attempt + 1} failed:`, error);

        // Check if it's a connection error that warrants retry
        const isConnectionError =
          error instanceof Error &&
          (error.message.includes('connection') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch failed') ||
            error.message.includes('other side closed') ||
            error.message.includes('ECONNRESET') ||
            error.message.includes('ENOTFOUND') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Failed to fetch'));

        if (attempt < retries && isConnectionError) {
          const waitTime = Math.pow(2, attempt + 1) * 1000; // Exponential backoff: 2s, 4s, 8s
          console.log(`Connection error detected, retrying in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else if (!isConnectionError) {
          // If it's not a connection error, don't retry
          console.log('Non-connection error detected, not retrying');
          break;
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
      setHasValidatedSession(false); // Reset validation flag for new login
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
        setHasValidatedSession(true); // Mark that we've validated this session
      } else {
        // Invalid session, clear storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('originalEmployeeKey');
        setCurrentUser(null);
        setSessionToken(null);
        setHasValidatedSession(false);
      }
    } else {
      setCurrentUser(null);
      setSessionToken(null);
      setHasValidatedSession(false);
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
      const requestId = `session-poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Don't validate if user is actively working (within last 30 seconds)
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity < 30000) {
        console.log(
          `[${requestId}] ⏭️ Skipping session validation - user is actively working (${timeSinceLastActivity}ms since last activity)`
        );
        return;
      }

      // Don't validate if user is working on important task
      if (isWorkingOnImportantTask) {
        console.log(
          `[${requestId}] ⏭️ Skipping session validation - user is working on important task`
        );
        return;
      }

      console.log(`[${requestId}] 🔍 Periodic session validation started`);
      const user = await validateSessionWithRetry(sessionToken);
      if (!user) {
        console.warn(`[${requestId}] ⚠️ Session validation failed - logging out user`);
        // Session is invalid, logout
        logout();
      } else {
        console.log(
          `[${requestId}] ✅ Periodic session validation successful - updating user data`
        );
        // Update user data (but preserve employeeKey from login)
        setCurrentUser(user);
        setLastActivity(Date.now()); // Reset activity timer on successful validation
      }
    };

    // Skip immediate validation if we just logged in OR if we've already validated this session
    if (justLoggedIn || hasValidatedSession) {
      console.log(
        'Skipping immediate validation - user just logged in or session already validated'
      );
      // Reset the validation flag after a delay to allow future validations
      if (hasValidatedSession) {
        setTimeout(() => setHasValidatedSession(false), 5000); // Reset after 5 seconds
      }
    } else {
      // Validate immediately for existing sessions
      validateCurrentSession();
    }

    // Always set up interval for periodic validation (after 5 minutes)
    const interval = setInterval(validateCurrentSession, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [sessionToken, justLoggedIn, lastActivity, isWorkingOnImportantTask, hasValidatedSession]);

  // Store status polling for auto-logout (reduced frequency since we have real sessions now)
  useEffect(() => {
    if (!currentUser || !sessionToken) return;

    const checkStoreStatus = async () => {
      const requestId = `store-status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        console.log(`[${requestId}] 🏪 Checking store status...`);
        const res = await fetch('/api/store/status');
        const data = await res.json();

        console.log(`[${requestId}] 📊 Store status:`, {
          isOpen: data.isOpen,
          userRole: currentUser?.role,
          timestamp: new Date().toISOString(),
        });

        // If store is closed and user is not admin, check if session is still valid
        // The server-side invalidation should handle this, but this is a backup
        if (!data.isOpen && currentUser?.role !== 'admin') {
          console.log(
            `[${requestId}] 🔒 Store is closed - checking session validity for non-admin user`
          );

          // Don't validate if user is actively working (within last 30 seconds)
          const timeSinceLastActivity = Date.now() - lastActivity;
          if (timeSinceLastActivity < 30000) {
            console.log(
              `[${requestId}] ⏭️ Skipping store status validation - user is actively working (${timeSinceLastActivity}ms since last activity)`
            );
            return;
          }

          // Don't validate if user is working on important task
          if (isWorkingOnImportantTask) {
            console.log(
              `[${requestId}] ⏭️ Skipping store status validation - user is working on important task`
            );
            return;
          }

          console.log(`[${requestId}] 🔍 Validating session for closed store...`);
          const user = await validateSessionWithRetry(sessionToken);
          if (!user) {
            console.warn(
              `[${requestId}] ⚠️ Store closed - session invalidated by server, logging out user`
            );
            logout();
          } else {
            console.log(`[${requestId}] ✅ Session still valid despite closed store`);
          }
        }
      } catch (error) {
        console.error(`[${requestId}] ❌ Store status check failed:`, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
        });
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
    setHasValidatedSession(false); // Reset validation flag
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
