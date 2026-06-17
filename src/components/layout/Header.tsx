"use client";
import { Search, Download, Share, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SyncIndicator } from "./SyncIndicator";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const Header = ({ title, subtitle }: HeaderProps) => {
  const { user, role } = useAuth();
  const { canInstall, isIOS, install } = usePWAInstall();
  const isMobile = useIsMobile();

  const handleInstall = async () => {
    if (isIOS) {
      toast.info(
        "To install: tap the Share button, then 'Add to Home Screen'",
        { duration: 5000 }
      );
    } else {
      const success = await install();
      if (success) {
        toast.success("App installed successfully!");
      }
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "org_admin":
        return "Organization Admin";
      case "lga_chairman":
        return "LGA Chairman";
      case "councillor":
        return "Councillor";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      const names = user.user_metadata.full_name.split(" ");
      return names.map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getUserName = () => {
    return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-border/50 safe-area-top">
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Left Section - Title */}
        <div className="flex-1 min-w-0 animate-slide-in-left">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sync status indicator */}
          <SyncIndicator />

          {/* Search - Hidden on mobile, shown on tablet+ */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="input-premium pl-10 w-48 xl:w-64 py-2"
            />
          </div>

          {/* Search button for tablet */}
          <button className="p-2 rounded-lg hover:bg-muted transition-colors hidden md:flex lg:hidden tap-target">
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* Install App Button - Mobile Only */}
          {canInstall && isMobile && (
            <Button
              onClick={handleInstall}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {isIOS ? <Share className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Install</span>
            </Button>
          )}

          {/* Notifications Toggle */}
          <div className="hidden sm:block">
            <NotificationToggle />
          </div>

          {/* Mobile Notifications Bell */}
          <button className="p-2 rounded-lg hover:bg-muted transition-colors sm:hidden tap-target">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* User Profile - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-3 pl-3 sm:pl-4 border-l border-border">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                {getUserName()}
              </p>
              <p className="text-xs text-muted-foreground">{getRoleLabel()}</p>
            </div>
            <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border-2 border-brand/40 shadow-sm cursor-pointer hover:opacity-90 transition-opacity">
              <AvatarImage src={user?.user_metadata?.avatar_url} alt={getUserName()} />
              <AvatarFallback className="bg-brand text-brand-foreground font-semibold text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
