"use client";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  variant?: "default" | "accent" | "danger";
}

const KPICard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  variant = "default",
}: KPICardProps) => {
  const cardClass =
    variant === "accent"
      ? "kpi-card-accent"
      : variant === "danger"
      ? "kpi-card-danger"
      : "kpi-card";

  const changeColor =
    changeType === "positive"
      ? "text-success"
      : changeType === "negative"
      ? "text-destructive"
      : "text-muted-foreground";

  const iconBgColor =
    variant === "default"
      ? "bg-muted"
      : "bg-white/10";

  const iconColor =
    variant === "default"
      ? "text-navy-deep"
      : "text-white";

  return (
    <div className={cardClass}>
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[11px] sm:text-sm font-semibold leading-tight line-clamp-2 ${
              variant === "default" ? "text-muted-foreground" : "text-white/85"
            }`}
          >
            {title}
          </p>
          <p
            className={`text-xl sm:text-2xl lg:text-3xl font-extrabold mt-1 sm:mt-2 tracking-tight ${
              variant === "default" ? "text-foreground" : "text-white"
            }`}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {change && (
            <p className={`text-[10px] sm:text-xs mt-1 sm:mt-1.5 line-clamp-1 ${variant === "default" ? changeColor : "text-white/80"}`}>
              {change}
            </p>
          )}
        </div>
        <div className={`${iconBgColor} p-1.5 sm:p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;
