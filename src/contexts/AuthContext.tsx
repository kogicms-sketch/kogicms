import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/loose-client";

type AppRole = "super_admin" | "org_admin" | "lga_chairman" | "councillor" | "senatorial_leader" | "federal_rep" | "house_assembly_member" | "polling_unit_agent" | "student" | "member" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAsMock: (targetRole?: AppRole) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  accountStatus: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  
  // Instant local-storage based state initialization
  const [role, setRole] = useState<AppRole>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("auth_role") as AppRole) || null;
    }
    return null;
  });
  
  const [organizationId, setOrganizationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_organization_id") || null;
    }
    return null;
  });

  const [accountStatus, setAccountStatus] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_account_status") || "active";
    }
    return "active";
  });

  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      // If we already have a cached role, we don't need to block UI with a loading spinner
      return localStorage.getItem("auth_role") === null;
    }
    return true;
  });

  const isMockRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  // Helper to wrap promises in a timeout to prevent hanging states
  function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<T>((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn(`Promise timed out after ${timeoutMs}ms`);
        resolve(fallback);
      }, timeoutMs);
    });

    return Promise.race([
      promise.then((result) => {
        clearTimeout(timeoutId);
        return result;
      }),
      timeoutPromise
    ]);
  }

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching role for user:", userId);
      if (isMockRef.current) return "super_admin";

      // 1. Direct fast check: profiles table
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.role) {
          return profile.role as AppRole;
        }
      } catch (e) {
        // continue
      }

      const rolePromise = supabase.rpc('get_user_role', {
        _user_id: userId
      });

      const roleResult = await withTimeout(
        rolePromise,
        5000,
        { data: null, error: { message: "Role fetch timed out" } }
      );

      const { data, error } = roleResult as any;
      console.log("Role fetch RPC result:", { data, error });

      if (error) {
        console.warn("Non-critical notice during role fetch:", error?.message || error);
        
        // Attempt secondary fast fallback directly from members table
        try {
          const { data: memberData } = await supabase
            .from("members")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

          if (memberData?.role) {
            return memberData.role as AppRole;
          }
        } catch (e) {
          // ignore fallback error
        }

        return null;
      }
      return data as AppRole;
    } catch (err) {
      console.warn("Handled exception in fetchUserRole:", err);
      return null;
    }
  };

  const fetchUserOrganization = async (userId: string) => {
    try {
      if (isMockRef.current) return null;

      const orgPromise = supabase
        .from("organization_admins")
        .select("organization_id")
        .eq("user_id", userId)
        .maybeSingle();

      const orgResult = await withTimeout(
        orgPromise,
        5000,
        { data: null, error: null }
      );

      const { data, error } = orgResult as any;

      if (error) {
        console.warn("Non-critical notice during user organization fetch:", error);
        return null;
      }
      return data?.organization_id || null;
    } catch (err) {
      console.warn("Handled exception in fetchUserOrganization:", err);
      return null;
    }
  };

  const fetchUserData = async (userId: string) => {
    const userRole = await fetchUserRole(userId);
    
    // Fall back to cached role if the network check timed out or failed
    const activeRole = userRole || (localStorage.getItem("auth_role") as AppRole);
    
    if (activeRole) {
      setRole(activeRole);
      localStorage.setItem("auth_role", activeRole);
    } else {
      setRole(null);
      localStorage.removeItem("auth_role");
    }

    if (activeRole === "org_admin") {
      const orgId = await fetchUserOrganization(userId);
      const activeOrgId = orgId || localStorage.getItem("auth_organization_id");
      if (activeOrgId) {
        setOrganizationId(activeOrgId);
        localStorage.setItem("auth_organization_id", activeOrgId);
      } else {
        setOrganizationId(null);
        localStorage.removeItem("auth_organization_id");
      }

      if (!isMockRef.current) {
        const currentDevice = navigator.userAgent;
        try {
          const checkResultPromise = (supabase.rpc as any)('check_and_update_device', {
            p_device_info: currentDevice
          });
          const checkResultData = await withTimeout(
            checkResultPromise,
            3000,
            { data: null, error: null }
          ) as any;

          const { data: checkResult, error: checkError } = checkResultData;

          if (checkError) {
            console.error("Device check failed:", checkError);
          }

          if (checkResult) {
            const status = (checkResult as any).status;
            const action = (checkResult as any).action;

            setAccountStatus(status);
            localStorage.setItem("auth_account_status", status);

            if (status === 'suspended') {
              if (action === 'mismatch_detected') {
                alert("Security Alert: You have been suspended due to a login from an unrecognized device.");
              }
              return;
            }
          } else {
            // Load profiles in a non-blocking background promise
            supabase
              .from("profiles")
              .select("account_status")
              .eq("id", userId)
              .maybeSingle()
              .then(({ data, error }: any) => {
                if (!error && data) {
                  const status = data.account_status || 'active';
                  setAccountStatus(status);
                  localStorage.setItem("auth_account_status", status);
                }
              })
              .catch((err) => console.error("Non-blocking profile check exception:", err));
          }
        } catch (err) {
          console.error("Security check exception:", err);
        }
      }
    } else {
      setOrganizationId(null);
      localStorage.removeItem("auth_organization_id");
      
      if (!isMockRef.current) {
        // Load profiles in a non-blocking background promise
        supabase
          .from("profiles")
          .select("account_status")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data, error }: any) => {
            if (!error && data) {
              const status = data.account_status || 'active';
              setAccountStatus(status);
              localStorage.setItem("auth_account_status", status);
            }
          })
          .catch((err) => console.error("Non-blocking profile check exception:", err));
      }
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (isMockRef.current) return;

        console.log("Auth state change event:", event, session?.user?.id);

        const prevUserId = currentUserIdRef.current;
        const currentUserId = session?.user?.id ?? null;
        currentUserIdRef.current = currentUserId;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const isNewUser = prevUserId !== currentUserId;
          const hasCachedRole = localStorage.getItem("auth_role") !== null;
          const shouldShowLoading = (!hasLoadedRef.current || isNewUser) && !hasCachedRole;

          if (shouldShowLoading) {
            setLoading(true);
          }

          try {
            await fetchUserData(session.user.id);
            hasLoadedRef.current = true;
          } catch (error) {
            console.error("Error fetching user data on auth change:", error);
          } finally {
            setLoading(false);
          }
        } else {
          setRole(null);
          setOrganizationId(null);
          setAccountStatus("active");
          localStorage.removeItem("auth_role");
          localStorage.removeItem("auth_organization_id");
          localStorage.removeItem("auth_account_status");
          hasLoadedRef.current = false;
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isMockRef.current) return;

      console.log("Initial getSession session user:", session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        currentUserIdRef.current = session.user.id;
        
        const hasCachedRole = localStorage.getItem("auth_role") !== null;
        const shouldShowLoading = !hasLoadedRef.current && !hasCachedRole;
        if (shouldShowLoading) {
          setLoading(true);
        }

        try {
          await fetchUserData(session.user.id);
          hasLoadedRef.current = true;
        } catch (error) {
          console.error("Error fetching user data on initial load:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInAsMock = async (targetRole: AppRole = "student") => {
    isMockRef.current = true;
    const mockUser: any = {
      id: "mock-student-id-001",
      email: `${targetRole}@kogicms.ng`,
      user_metadata: { full_name: "Kogi Student Monitor" },
    };
    setUser(mockUser);
    setSession({ user: mockUser } as any);
    setRole(targetRole);
    setAccountStatus("active");
    localStorage.setItem("auth_role", targetRole || "student");
    localStorage.setItem("auth_account_status", "active");
    return { error: null };
  };

  const signOut = async () => {
    isMockRef.current = false;
    currentUserIdRef.current = null;
    hasLoadedRef.current = false;
    localStorage.removeItem("auth_role");
    localStorage.removeItem("auth_organization_id");
    localStorage.removeItem("auth_account_status");
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setOrganizationId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, organizationId, loading, signIn, signInAsMock, signUp, signOut, accountStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
