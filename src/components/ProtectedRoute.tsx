"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("super_admin" | "org_admin" | "lga_chairman" | "councillor" | "senatorial_leader" | "federal_rep" | "house_assembly_member" | "member" | "polling_unit_agent" | "student")[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, role, loading, accountStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/");
      } else if (allowedRoles && role && !allowedRoles.includes(role)) {
        router.replace("/dashboard");
      }
    }
  }, [user, role, loading, allowedRoles, router]);

  // While checking auth, do not render children to prevent duplicate unauthenticated renders
  if (loading) {
    return null;
  }

  // If user is not authenticated or role is not allowed, do not render
  if (!user || (allowedRoles && role && !allowedRoles.includes(role))) {
    return null;
  }

  if (accountStatus && accountStatus !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-4">
          <h1 className="text-xl font-bold text-foreground">Account Suspended</h1>
          <p className="text-muted-foreground max-w-sm">
            Your account has been suspended or deactivated. Please contact the Super Admin for assistance.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
