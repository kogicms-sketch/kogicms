"use client";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Lock, Mail, Loader2, Download, Share, Smartphone, Shield, Users, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { useParty } from "@/contexts/PartyContext";
import { PARTIES, DEFAULT_PARTY } from "@/config/parties";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const { signIn, signUp, signInAsMock, user, loading, role } = useAuth();
  const { party: contextParty } = useParty();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const party = mounted ? contextParty : PARTIES[DEFAULT_PARTY];
  const { canInstall, isIOS, install } = usePWAInstall();
  const isMobile = useIsMobile();

  const handleInstall = async () => {
    if (isIOS) {
      toast.info(
        "To install: tap the Share button below, then 'Add to Home Screen'",
        { duration: 5000 }
      );
    } else {
      const success = await install();
      if (success) {
        toast.success("App installed successfully!");
      }
    }
  };

  useEffect(() => {
    if (!loading && user) {
      // Role-based redirect
      if (role === 'lga_chairman') {
        navigate("/chairman/dashboard", { replace: true });
      } else if (role === 'councillor') {
        navigate("/councillor/dashboard", { replace: true });
      } else if (role === 'senatorial_leader') {
        navigate("/senatorial/dashboard", { replace: true });
      } else if (role === 'federal_rep') {
        navigate("/federal/dashboard", { replace: true });
      } else if (role === 'house_assembly_member') {
        navigate("/assembly/dashboard", { replace: true });
      } else if (role === 'student') {
        navigate("/student/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast.error(emailResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast.error(passwordResult.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else if (error.message.includes("Database error querying schema") || error.message.includes("500") || error.message.includes("Internal Server Error")) {
          toast.error("Database error. This account may need repair. Please contact your administrator or try a different account.");
        } else {
          toast.error(error.message || "Login failed. Please try again.");
        }
        setIsRedirecting(false);
      } else {
        setIsRedirecting(true);
        toast.success("Welcome back!");
        // Will be redirected by useEffect based on role
      }
    } catch (err) {
      console.error("Unexpected error during login:", err);
      toast.error("An unexpected error occurred. Please try Demo Mode below.");
      setIsRedirecting(false);
    } finally {
      setIsLoading(false);
    }
  };

  const BrandedSplash = ({ message }: { message: string }) => (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, hsl(${party.colors.primary}), hsl(${party.colors.primaryDark}), hsl(${party.colors.secondary}))` }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full blur-2xl" style={{ background: `hsl(${party.colors.accent} / 0.2)` }} />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
      >
        <div className="relative w-40 h-40 sm:w-56 sm:h-56">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-[60px]" />
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-full h-full rounded-full border-[10px] border-white/20 bg-white/10 backdrop-blur-md shadow-[0_0_80px_rgba(255,255,255,0.25)] overflow-hidden flex items-center justify-center p-6"
          >
            <img src={party.logo} alt={`${party.name} logo`} className="w-full h-full object-contain drop-shadow-2xl" />
          </motion.div>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Kogi State {party.shortName}</h1>
          <p className="text-sm sm:text-base text-white/80">{party.fullName}</p>
        </div>
        <div className="flex items-center gap-2 text-white/90 mt-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">{message}</span>
        </div>
      </motion.div>
    </div>
  );

  // Prevent SSR hydration mismatch: render consistent BrandedSplash until mounted on client
  if (!mounted || isRedirecting || (loading && user)) {
    return <BrandedSplash message={isRedirecting ? "Signing you in…" : "Loading…"} />;
  }

  if (loading) {
    return <BrandedSplash message="Loading…" />;
  }

  const stats = [
    { icon: Building2, value: "48+", label: "Organizations" },
    { icon: Users, value: "26K+", label: "Members" },
    { icon: MapPin, value: "36", label: "States" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Gradient Background with Party Colors */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${party.colors.primary}), hsl(${party.colors.primaryDark}), hsl(${party.colors.secondary}))` }} />

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 rounded-full blur-2xl" style={{ background: `hsl(${party.colors.accent} / 0.2)` }} />
        </div>

        {/* Branding Container */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="relative w-full max-w-lg aspect-square">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-[80px]" />
            <div className="relative w-full h-full rounded-full border-[12px] border-white/20 bg-white/10 backdrop-blur-md shadow-[0_0_100px_rgba(255,255,255,0.2)] overflow-hidden flex items-center justify-center p-8 transition-transform duration-700 hover:scale-[1.02]">
              <img
                src={party.logo}
                alt={`${party.name} logo`}
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 p-1.5 flex items-center justify-center overflow-hidden border border-white/30 shadow-xs">
              <img src={party.logo} alt={party.shortName} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Kogi State {party.shortName}
              </h1>
              <p className="text-sm text-white/80">{party.fullName}</p>
            </div>
          </motion.div>

          {/* Hero Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Command Your
                <br />
                <span className="text-white">Campaign.</span>
              </h2>
              <p className="text-lg text-white/80 max-w-md leading-relaxed">
                Enterprise-grade platform for political campaign monitoring,
                organization management, and grassroots mobilization.
              </p>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 xl:gap-10">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-2">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-2xl xl:text-3xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/60">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-sm text-white/40"
          >
            © 2026 YMD CMS. All rights reserved.
          </motion.p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col">
        {/* Mobile Header with Gradient */}
        <div className="lg:hidden relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))]" />
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[hsl(var(--apc-green)/0.3)] rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 px-6 pt-10 pb-8 safe-area-top">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[hsl(var(--apc-green))] rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-white/50 overflow-hidden p-3 transition-transform duration-500 hover:scale-105">
                  <img src={party.logo} alt={`${party.name} logo`} className="w-full h-full object-contain" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Kogi State {party.shortName}
              </h1>
              <p className="text-sm text-white/60">{party.tagline}</p>
            </motion.div>
          </div>
        </div>

        {/* Form Section */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full max-w-md"
          >
            {/* Install App Banner - Mobile Only */}
            {canInstall && isMobile && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="lg:hidden mb-6 p-4 rounded-2xl bg-gradient-to-r from-[hsl(var(--navy-deep)/0.08)] to-[hsl(var(--apc-green)/0.05)] border border-primary/10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))] rounded-xl flex items-center justify-center shadow-lg">
                    <Smartphone className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Install YMD CMS App</p>
                    <p className="text-xs text-muted-foreground">Get quick access from home screen</p>
                  </div>
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="gap-1.5 bg-[hsl(var(--apc-green))] hover:bg-[hsl(var(--apc-green-dark))] shadow-lg"
                  >
                    {isIOS ? <Share className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    Install
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Welcome back
              </h2>
              <p className="text-muted-foreground mt-2">
                Sign in to access your command center
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background transition-all duration-200"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-background transition-all duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 text-sm cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded-md border-2 border-border bg-muted/50 peer-checked:bg-primary peer-checked:border-primary transition-all" />
                    <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Remember me</span>
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(var(--navy-deep))] to-[hsl(var(--navy-medium))] hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-border space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Don't have an account?{" "}
                <span className="text-primary font-medium">Contact your administrator</span>
              </p>
            </div>
          </motion.div>
        </div>

        {/* Mobile Footer - Copyright */}
        <div className="lg:hidden px-6 pb-6 safe-area-bottom">
          <p className="text-xs text-center text-muted-foreground">
            © 2026 YMD CMS
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
