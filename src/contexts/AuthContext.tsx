import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/loose-client";
import { MOCK_USERS } from "@/data/mock_users";

type AppRole = "super_admin" | "org_admin" | "lga_chairman" | "councillor" | "ward_chairman" | "ward_leader" | "senatorial_leader" | "federal_rep" | "house_assembly_member" | "polling_unit_agent" | "student" | "member" | null;

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

      // Helper to normalize roles
      const normalizeRole = (r: string | null | undefined): AppRole => {
        if (!r) return null;
        const norm = r.toLowerCase().trim();
        if (norm === "ward_chairman" || norm === "ward_leader" || norm === "ward_admin" || norm === "councillor") {
          return "councillor";
        }
        if (norm === "polling_unit_agent" || norm === "agent" || norm === "pu_agent" || norm === "polling_agent") {
          return "polling_unit_agent";
        }
        return norm as AppRole;
      };

      // 1. Direct fast check: user metadata
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId && user.user_metadata?.role) {
          const mRole = normalizeRole(user.user_metadata.role);
          if (mRole) return mRole;
        }
      } catch (e) {}

      // 2. Direct fast check: profiles table
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, lga, ward")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.role) {
          return normalizeRole(profile.role);
        }
      } catch (e) {
        // continue
      }

      // 3. Direct fast check: mock_users in localStorage
      if (typeof window !== "undefined") {
        try {
          const rawMock = localStorage.getItem("mock_users");
          if (rawMock) {
            const mockUsers = JSON.parse(rawMock);
            const foundUser = mockUsers.find((u: any) => u.id === userId || (user?.email && u.email?.toLowerCase().trim() === user.email.toLowerCase().trim()));
            if (foundUser?.role) {
              return normalizeRole(foundUser.role);
            }
          }
        } catch (e) {}
      }

      // 4. Check assigned_pu_agents in localStorage
      if (typeof window !== "undefined") {
        try {
          const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
          const userEmail = (user?.email || "").toLowerCase().trim();
          for (const [, agentInfo] of Object.entries(assignedLocal) as [string, any][]) {
            if (
              (agentInfo.email && agentInfo.email.toLowerCase().trim() === userEmail) ||
              (agentInfo.user_id && agentInfo.user_id === userId)
            ) {
              return "polling_unit_agent";
            }
          }
        } catch (e) {}
      }

      // 5. Fallback if profile has ward and no other role
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("ward")
          .eq("id", userId)
          .maybeSingle();
        if (profile?.ward) {
          return "councillor";
        }
      } catch (e) {}

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
            return normalizeRole(memberData.role);
          }
        } catch (e) {
          // ignore fallback error
        }

        return null;
      }
      return normalizeRole(data);
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
    const normEmail = email.toLowerCase().trim();

    // 1. Check local mock_users & assigned_pu_agents for instant local/offline authentication
    if (typeof window !== "undefined") {
      try {
        const rawMock = localStorage.getItem("mock_users");
        let mockUsers: any[] = rawMock ? JSON.parse(rawMock) : [];
        const currentEmails = new Set(mockUsers.map((u: any) => u.email?.toLowerCase().trim()));
        for (const mu of MOCK_USERS) {
          if (!currentEmails.has(mu.email.toLowerCase().trim())) {
            mockUsers.push(mu);
          }
        }
        localStorage.setItem("mock_users", JSON.stringify(mockUsers));

        const found = mockUsers.find(
          (u: any) => u.email?.toLowerCase().trim() === normEmail && u.password === password
        );
        if (found) {
          console.log("Logged in via mock_users:", found);
          const mockUser: any = {
            id: found.id || `user_${Date.now()}`,
            email: found.email,
            user_metadata: {
              full_name: found.full_name || found.name,
              role: found.role,
              lga: found.lga,
              ward: found.ward,
              polling_unit_id: found.polling_unit_id,
              polling_unit_name: found.polling_unit_name,
              phone: found.phoneNumber || found.phone,
              zone_code: found.zone_code,
              zone_name: found.zone_name,
              constituency_code: found.constituency_code,
              constituency_name: found.constituency_name,
              lga_list: found.lga_list,
            },
          };
          setUser(mockUser);
          setSession({ user: mockUser } as any);
          const roleNorm = (found.role === "agent" || found.role === "pu_agent") ? "polling_unit_agent" : found.role;
          setRole(roleNorm as AppRole);
          setAccountStatus("active");
          localStorage.setItem("auth_role", roleNorm || "polling_unit_agent");
          localStorage.setItem("auth_account_status", "active");
          localStorage.setItem("auth_email", found.email);

          if (found.role === "senatorial_leader") {
            localStorage.setItem("senatorial_leader_profile", JSON.stringify({
              id: found.id,
              user_id: found.id,
              zone_name: found.zone_name || "Kogi Central Senatorial District",
              zone_code: found.zone_code || "KGI-CENTRAL",
              lga_list: found.lga_list || ["Adavi", "Ajaokuta", "Ogori/Magongo", "Okehi", "Okene"],
              leader_name: found.full_name || found.name,
              phone: found.phoneNumber || found.phone || null,
              email: found.email,
              is_active: true,
              must_change_password: found.must_change_password !== false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
          }

          if (found.role === "federal_rep") {
            localStorage.setItem("federal_rep_profile", JSON.stringify({
              id: found.id,
              user_id: found.id,
              constituency_name: found.constituency_name || "Federal Constituency",
              constituency_code: found.constituency_code || "FED-01",
              lga_list: found.lga_list || ["Lokoja", "Kogi (Koton Karfe)"],
              rep_name: found.full_name || found.name,
              phone: found.phoneNumber || found.phone || null,
              email: found.email,
              is_active: true,
              must_change_password: found.must_change_password !== false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));
          }

          if (found.organization_id) {
            setOrganizationId(found.organization_id);
            localStorage.setItem("auth_organization_id", found.organization_id);
          }
          return { error: null };
        }

        // Also check assigned_pu_agents directly
        const assignedLocal = JSON.parse(localStorage.getItem("assigned_pu_agents") || "{}");
        for (const [, agentInfo] of Object.entries(assignedLocal) as [string, any][]) {
          if (
            agentInfo.email &&
            agentInfo.email.toLowerCase().trim() === normEmail &&
            agentInfo.password === password
          ) {
            console.log("Logged in via assigned_pu_agents:", agentInfo);
            const mockUser: any = {
              id: agentInfo.id || `pu_agent_${Date.now()}`,
              email: agentInfo.email,
              user_metadata: {
                full_name: agentInfo.agent_name,
                role: "polling_unit_agent",
                lga: agentInfo.lga,
                ward: agentInfo.ward,
                polling_unit_id: agentInfo.pu_id || agentInfo.id,
                polling_unit_name: agentInfo.pu_name,
                phone: agentInfo.phone,
              },
            };
            setUser(mockUser);
            setSession({ user: mockUser } as any);
            setRole("polling_unit_agent");
            setAccountStatus("active");
            localStorage.setItem("auth_role", "polling_unit_agent");
            localStorage.setItem("auth_account_status", "active");
            return { error: null };
          }
        }
      } catch (e) {}
    }

    // 2. Fall back to Supabase Auth
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && authData?.user) {
      if (authData.user.user_metadata?.role) {
        const norm = authData.user.user_metadata.role.toLowerCase().trim();
        if (norm === "polling_unit_agent" || norm === "agent" || norm === "pu_agent") {
          setRole("polling_unit_agent");
          localStorage.setItem("auth_role", "polling_unit_agent");
        }
      }
    }

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
