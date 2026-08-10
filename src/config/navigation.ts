import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  BarChart3,
  Bell,
  Sparkles,
  Folder,
  ShieldCheck,
  Calendar,
  Target,
  Megaphone,
  Radio,
  ClipboardList,
  CheckCircle,
  MessageSquare,
  Gift,
  CreditCard,
} from "lucide-react";

export type NavGroup = "Main Menu" | "Operations" | "Tools";

export interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  group: NavGroup;
  inBottomNav?: boolean;
  roles?: (
    | "super_admin"
    | "org_admin"
    | "member"
    | "lga_chairman"
    | "councillor"
    | "polling_unit_agent"
    | "senatorial_leader"
    | "federal_rep"
    | "house_assembly_member"
    | "student"
  )[];
}

export const navItems: NavItem[] = [
  // Student Dashboard
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/student/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["student"],
  },

  // Dashboard navigation for specific roles
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/senatorial/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["senatorial_leader"],
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/federal/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["federal_rep"],
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/assembly/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["house_assembly_member"],
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/chairman/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["lga_chairman"],
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/councillor/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["councillor"],
  },
  {
    label: "PU Agents Payment",
    icon: CreditCard,
    path: "/councillor/agents",
    group: "Main Menu",
    roles: ["councillor", "lga_chairman", "super_admin"],
  },
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["polling_unit_agent"],
  },

  // General navigation
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    group: "Main Menu",
    inBottomNav: true,
    roles: ["super_admin", "org_admin", "member"],
  },
  {
    label: "Target Management",
    icon: Target,
    path: "/target-management",
    group: "Main Menu",
    roles: ["super_admin"],
  },
  {
    label: "Organizations",
    icon: Building2,
    path: "/organization-admins",
    group: "Main Menu",
    roles: ["super_admin", "lga_chairman"],
  },
  {
    label: "Support Groups",
    icon: ShieldCheck,
    path: "/support-groups",
    group: "Main Menu",
    roles: [
      "super_admin",
      "member",
      "lga_chairman",
      "councillor",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Events",
    icon: Calendar,
    path: "/events",
    group: "Operations",
    inBottomNav: true,
    roles: [
      "super_admin",
      "org_admin",
      "member",
      "lga_chairman",
      "councillor",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Situation Room",
    icon: Radio,
    path: "/situation-room",
    group: "Operations",
    inBottomNav: true,
    roles: [
      "super_admin",
      "lga_chairman",
      "councillor",
      "polling_unit_agent",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Command Video Wall",
    icon: Radio,
    path: "/situation-room/live",
    group: "Operations",
    roles: [
      "super_admin",
      "lga_chairman",
      "councillor",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Election Day",
    icon: ClipboardList,
    path: "/election-day",
    group: "Operations",
    inBottomNav: true,
    roles: [
      "super_admin",
      "lga_chairman",
      "polling_unit_agent",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Polling Unit Cells",
    icon: Target,
    path: "/polling-units",
    group: "Main Menu",
    inBottomNav: true,
    roles: [
      "super_admin",
      "member",
      "councillor",
      "polling_unit_agent",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Files",
    icon: Folder,
    path: "/files",
    group: "Tools",
    roles: ["super_admin", "org_admin"],
  },
  {
    label: "Members",
    icon: Users,
    path: "/members",
    group: "Main Menu",
    inBottomNav: true,
    roles: [
      "super_admin",
      "org_admin",
      "member",
      "lga_chairman",
      "councillor",
      "polling_unit_agent",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
      "student",
    ],
  },
  {
    label: "Welfare & Incentives",
    icon: Gift,
    path: "/welfare",
    group: "Operations",
    roles: [
      "super_admin",
      "lga_chairman",
      "councillor",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
      "student",
    ],
  },
  {
    label: "Activities",
    icon: CalendarDays,
    path: "/activities",
    group: "Operations",
    roles: ["super_admin", "org_admin", "member"],
  },
  {
    label: "Attendance",
    icon: CheckCircle,
    path: "/attendance",
    group: "Operations",
    roles: ["super_admin", "org_admin", "member"],
  },
  {
    label: "Reports",
    icon: BarChart3,
    path: "/reports",
    group: "Operations",
    roles: ["super_admin", "member"],
  },
  {
    label: "Post Generator",
    icon: Sparkles,
    path: "/post-generator",
    group: "Tools",
    roles: [
      "super_admin",
      "org_admin",
      "member",
      "lga_chairman",
      "councillor",
      "polling_unit_agent",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Chats",
    icon: MessageSquare,
    path: "/chat",
    group: "Tools",
    roles: [
      "super_admin",
      "lga_chairman",
      "councillor",
      "senatorial_leader",
      "federal_rep",
      "house_assembly_member",
    ],
  },
  {
    label: "Notifications",
    icon: Bell,
    path: "/notifications",
    group: "Tools",
    roles: ["super_admin", "org_admin", "member"],
  },
];
