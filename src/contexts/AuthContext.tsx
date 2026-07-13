import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, getStoredUser, setStoredUser, clearToken, clearStoredUser, setToken } from "@/lib/apiClient";

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
  is_approved?: boolean;
  is_admin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; code?: string }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      setIsLoading(false);
      return;
    }

    setUser(storedUser);
    authApi
      .getProfile()
      .then((result) => {
        if (result.error) {
          clearToken();
          clearStoredUser();
          setUser(null);
        } else if (result.data) {
          setUser(result.data);
          setStoredUser(result.data);
        }
      })
      .catch(() => {
        clearToken();
        clearStoredUser();
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      const result = await authApi.login(email, password);

      if (result.error) {
        return {
          success: false,
          error: result.error,
          code: result.error.toLowerCase().includes("pending")
            ? "pending_approval"
            : undefined,
        };
      }

      const loggedInUser = result.data?.user ?? getStoredUser();
      if (loggedInUser) {
        setUser(loggedInUser);
        setStoredUser(loggedInUser);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const signup = async (email: string, password: string, fullName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authApi.signup(email, password, fullName);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const resendConfirmationEmail = async (_email: string): Promise<{ success: boolean; error?: string }> => {
    return {
      success: false,
      error: "Email verification is not required. Contact your administrator if your account is pending approval.",
    };
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const result = await authApi.resetPassword(email);
      if (result.error) {
        return { success: false, error: result.error };
      }
      const message =
        (result.data as { message?: string } | undefined)?.message ||
        "Contact your administrator to reset your password.";
      return { success: true, message };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        resendConfirmationEmail,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
