"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useParty } from "@/contexts/PartyContext";

export const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const { party } = useParty();
  const [c1, c2, c3] = [
    party.colors.swatches[0],
    party.colors.swatches[1] || "#FFFFFF",
    party.colors.swatches[2] || party.colors.swatches[0],
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400);
          return 100;
        }
        return prev + 3;
      });
    }, 25);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${c1} 0%, ${c1} 40%, ${c3} 100%)` }}
    >
      {/* Tricolor top stripe */}
      <div className="absolute top-0 left-0 right-0 flex h-2">
        <div className="flex-1" style={{ background: c1 }} />
        <div className="flex-1" style={{ background: c2 }} />
        <div className="flex-1" style={{ background: c3 }} />
      </div>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[100px]"
          style={{ background: c1 }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-[120px]"
          style={{ background: c3 }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Main */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
          className="relative mb-6"
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -inset-4 rounded-full blur-3xl"
            style={{ background: `radial-gradient(circle, ${c1} 0%, transparent 70%)` }}
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-3 rounded-full border-2 border-dashed border-white/20"
          />
          <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-white/40 bg-white shadow-[0_0_50px_rgba(255,255,255,0.3)] overflow-hidden flex items-center justify-center p-6 backdrop-blur-sm">
            <img src={party.logo} alt={`${party.name} logo`} className="w-full h-full object-contain" />
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-2 right-2 w-10 h-8 rounded-lg overflow-hidden border-2 border-white shadow-xl z-20 bg-white"
          >
            <img src={party.flag} alt={party.name} className="w-full h-full object-cover" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
            {party.shortName} Campaign
          </h1>
          <p className="text-sm font-semibold text-white/70 tracking-widest uppercase mb-1">
            Management System
          </p>
          <p className="text-xs text-white/60 tracking-[0.2em] uppercase">{party.tagline}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <div className="relative w-56 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
            <motion.div
              className="h-full rounded-full relative"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${c1}, ${c2}, ${c3})`,
              }}
              transition={{ duration: 0.1 }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full blur-sm" />
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-6 flex items-center gap-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  className="w-1.5 h-1.5 bg-white rounded-full"
                />
              ))}
            </div>
            <span className="text-xs text-white/60 font-medium tracking-wider uppercase">
              {progress < 30 ? "Initializing" : progress < 60 ? "Loading resources" : progress < 90 ? "Almost ready" : "Launching"}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Tricolor bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 flex h-2">
        <div className="flex-1" style={{ background: c1 }} />
        <div className="flex-1" style={{ background: c2 }} />
        <div className="flex-1" style={{ background: c3 }} />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute bottom-6 text-xs text-white/50 tracking-wider"
      >
        © 2026 {party.fullName}
      </motion.p>
    </motion.div>
  );
};
