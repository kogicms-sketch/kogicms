"use client";
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a short delay for better UX
      setTimeout(() => {
        setIsVisible(true);
      }, 3000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
    
    setIsVisible(false);
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store in session so it doesn't show again this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('pwa-prompt-dismissed')) {
      setIsVisible(false);
    }
  }, []);

  if (isInstalled || !isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-24 sm:bottom-4 left-4 right-4 z-40 md:left-auto md:right-4 md:w-96"
      >
        <div className="bg-card/95 border border-primary/20 rounded-xl shadow-2xl p-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center p-1.5 border border-primary/20">
              <img
                src="/parties/apm-logo.png"
                alt="APM Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as any).style.display = 'none';
                }}
              />
              <Smartphone className="w-6 h-6 text-primary hidden" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">Install Kogi State APM CMS</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Install Kogi State APM CMS as a mobile app for fast offline access and real-time field sync.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
              className="flex-1 text-xs"
            >
              Not now
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="flex-1 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
