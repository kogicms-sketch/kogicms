"use client";
import { usePathname } from "next/navigation";
import Link from 'next/link';
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import MobileMenu from "./MobileMenu";
import { navItems as allNavItems } from "@/config/navigation";

const MobileBottomNav = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { role } = useAuth();

  const bottomNavItems = allNavItems
    .filter((item) => !item.roles || (role && item.roles.includes(role as any)))
    .filter((item) => item.inBottomNav)
    .slice(0, 3);

  // Check if current path is active
  const isActive = (path: string) => {
    if (path === pathname) return true;
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path === "/senatorial/dashboard" && pathname === "/senatorial/dashboard") return true;
    if (path === "/federal/dashboard" && pathname === "/federal/dashboard") return true;
    if (path === "/chairman/dashboard" && pathname === "/chairman/dashboard") return true;
    if (path === "/councillor/dashboard" && pathname === "/councillor/dashboard") return true;
    if (path === "/student/dashboard" && pathname === "/student/dashboard") return true;
    return pathname.startsWith(path) && path !== "/dashboard";
  };

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-50 bg-background/90 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.18)] md:hidden mb-[env(safe-area-inset-bottom,0px)] transition-all duration-300">
      <div className="flex items-center justify-around h-16 px-1">
        {bottomNavItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex-1 h-full flex flex-col items-center justify-center transition-all duration-200 ${
                active 
                  ? "text-primary scale-105" 
                  : "text-muted-foreground hover:text-foreground"
              } tap-target`}
            >
              <div className="relative flex flex-col items-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${active ? "animate-pulse text-emerald-600" : ""}`} />
                {active && (
                  <span className="absolute -bottom-2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                )}
              </div>
              <span className={`text-[10px] mt-1 transition-all duration-200 ${active ? "font-bold text-emerald-700" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-200 tap-target">
              <div className="relative flex flex-col items-center">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-1 font-medium">Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[88vh] rounded-t-[2rem] p-0 border-t border-border bg-background/98 backdrop-blur-2xl shadow-2xl safe-area-bottom">
            <MobileMenu onClose={() => setIsMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
