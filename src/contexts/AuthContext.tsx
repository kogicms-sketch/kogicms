import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/loose-client";

type AppRole = "super_admin" | "org_admin" | "lga_chairman" | "councillor" | "senatorial_leader" | "federal_rep" | "house_assembly_member" | "polling_unit_agent" | "member" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
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

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching role for user:", userId);
      if (isMockRef.current) return "super_admin";

      const { data, error } = await supabase.rpc('get_user_role', {
        _user_id: userId
      });

      console.log("Role fetch RPC result:", { data, error });

      if (error) {
        console.error("Error fetching user role via RPC:", error);
        return null;
      }
      return data as AppRole;
    } catch (err) {
      console.error("Error in fetchUserRole:", err);
      return null;
    }
  };

  const fetchUserOrganization = async (userId: string) => {
    try {
      if (isMockRef.current) return null;

      const { data, error } = await supabase
        .from("organization_admins")
        .select("organization_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user organization:", error);
        return null;
      }
      return data?.organization_id || null;
    } catch (err) {
      console.error("Error in fetchUserOrganization:", err);
      return null;
    }
  };

  const fetchUserData = async (userId: string) => {
    const userRole = await fetchUserRole(userId);
    setRole(userRole);
    if (userRole) {
      localStorage.setItem("auth_role", userRole);
    } else {
      localStorage.removeItem("auth_role");
    }

    if (userRole === "org_admin") {
      const orgId = await fetchUserOrganization(userId);
      setOrganizationId(orgId);
      if (orgId) {
        localStorage.setItem("auth_organization_id", orgId);
      } else {
        localStorage.removeItem("auth_organization_id");
      }

      if (!isMockRef.current) {
        const currentDevice = navigator.userAgent;
        try {
          const { data: checkResult, error: checkError } = await (supabase.rpc as any)('check_and_update_device', {
            p_device_info: currentDevice
          });

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
            const { data } = await supabase
              .from("profiles")
              .select("account_status")
              .eq("id", userId)
              .maybeSingle() as any;
            const status = data?.account_status || 'active';
            setAccountStatus(status);
            localStorage.setItem("auth_account_status", status);
          }
        } catch (err) {
          console.error("Security check exception:", err);
        }
      }
    } else {
      setOrganizationId(null);
      localStorage.removeItem("auth_organization_id");
      
      if (!isMockRef.current) {
        const { data } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", userId)
          .maybeSingle() as any;
        const status = data?.account_status || 'active';
        setAccountStatus(status);
        localStorage.setItem("auth_account_status", status);
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
    <AuthContext.Provider value={{ user, session, role, organizationId, loading, signIn, signUp, signOut, accountStatus }}>
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
