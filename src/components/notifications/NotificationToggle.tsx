"use client";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotificationToggleProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export const NotificationToggle = ({
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: NotificationToggleProps) => {
  const { 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe, 
    isSupported,
    permission 
  } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const getTooltipText = () => {
    if (permission === "denied") {
      return "Notifications blocked. Please enable in browser settings.";
    }
    return isSubscribed ? "Disable notifications" : "Enable notifications";
  };

  const ButtonContent = () => (
    <>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-2">
          {isSubscribed ? "Notifications On" : "Notifications Off"}
        </span>
      )}
    </>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isLoading || permission === "denied"}
            className={isSubscribed ? "text-primary" : "text-muted-foreground"}
          >
            <ButtonContent />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};