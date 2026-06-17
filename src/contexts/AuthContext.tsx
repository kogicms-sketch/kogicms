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
  const [role, setRole] = useState<AppRole>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isMockRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching role for user:", userId);
      if (isMockRef.current) return "super_admin";

      // Use RPC to bypass RLS issues
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

    // If org_admin, also fetch their organization
    if (userRole === "org_admin") {
      const orgId = await fetchUserOrganization(userId);
      setOrganizationId(orgId);

      // SECURITY: Device Check
      if (!isMockRef.current) {
        const currentDevice = navigator.userAgent;

        try {
          // Use server-side function to check device and auto-suspend if needed
          // This bypasses RLS issues and ensures the logic runs atomically
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

            if (status === 'suspended') {
              if (action === 'mismatch_detected') {
                alert("Security Alert: You have been suspended due to a login from an unrecognized device.");
              }
              // Return early so ProtectedRoute picks up the suspension state
              return;
            }
          } else {
            // Fallback if null (shouldn't happen with correct SQL)
            const { data } = await supabase
              .from("profiles")
              .select("account_status")
              .eq("id", userId)
              .maybeSingle() as any;
            setAccountStatus(data?.account_status || 'active');
          }

        } catch (err) {
          console.error("Security check exception:", err);
        }
      }
    } else {
      setOrganizationId(null);
      // For non-org-admins, just get status
      if (!isMockRef.current) {
        const { data } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", userId)
          .maybeSingle() as any;
        setAccountStatus(data?.account_status || 'active');
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
          // Only show loading spinner if:
          // 1. We haven't loaded the initial data yet
          // 2. OR the user ID changed (different user logging in)
          const isNewUser = prevUserId !== currentUserId;
          const shouldShowLoading = !hasLoadedRef.current || isNewUser;

          if (shouldShowLoading) {
            setLoading(true);
          }

          try {
            await fetchUserData(session.user.id);
            hasLoadedRef.current = true;
          } catch (error) {
            console.error("Error fetching user data on auth change:", error);
          } finally {
            if (shouldShowLoading) {
              setLoading(false);
            }
          }
        } else {
          setRole(null);
          setOrganizationId(null);
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
        
        // Only show loading spinner if we haven't loaded yet
        const shouldShowLoading = !hasLoadedRef.current;
        if (shouldShowLoading) {
          setLoading(true);
        }

        try {
          await fetchUserData(session.user.id);
          hasLoadedRef.current = true;
        } catch (error) {
          console.error("Error fetching user data on initial load:", error);
        } finally {
          if (shouldShowLoading) {
            setLoading(false);
          }
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
