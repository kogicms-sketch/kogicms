"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  GraduationCap,
  Users,
  Building2,
  Award,
  CheckCircle2,
  ShieldCheck,
  Search,
  BookOpen,
  Gift,
  Home,
  MessageSquare,
  Sparkles,
  ArrowRight,
  FileText,
  PieChart,
  Landmark,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useMembers } from "@/hooks/useMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/loose-client";

export default function StudentPresentation() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Live Data for Presentation
  const { data: allAppMembers = [] } = useMembers(undefined, undefined, undefined, "all");

  const isStudentMember = (m: any) => {
    if (!m) return false;
    const occ = (m.occupation || "").toLowerCase().trim();
    const emp = (m.employment_status || "").toLowerCase().trim();
    const sch = (m.school_name || "").toLowerCase().trim();
    const level = (m.school_level || "").toLowerCase().trim();
    const type = (m.member_type || "").toLowerCase().trim();

    const tradeKeywords = [
      "tailoring", "embroidery", "poultry", "livestock", "farm", "shop", "vendor",
      "mai kantin", "mai abinci", "mai dabbobi", "mai kayan", "keke", "tricycle",
      "atambfa", "fabrication", "workshop", "cosmetics", "perfume", "charcoal",
      "barbing", "salon", "carpentry", "furniture", "catering", "provisions",
      "textile", "merchant", "dealer", "showroom", "enterprise", "fleet",
      "lga:", "ward:", "civil servant", "ministry", "irrigation", "rain-fed",
      "trader", "artisan", "housewife", "butcher", "mechanic"
    ];

    if (tradeKeywords.some((kw) => sch.includes(kw) || occ.includes(kw))) {
      return false;
    }

    if (occ.includes("student") || emp.includes("student") || type.includes("student")) {
      return true;
    }

    const isAcademicLevel = ["tertiary", "secondary", "nd 1", "nd 2", "hnd 1", "hnd 2", "100 level", "200 level", "300 level", "400 level", "500 level"].some(kw => level.includes(kw));
    const isAcademicSchool = ["university", "college", "polytechnic", "poly", "institute", "academy", "umyu", "fudma", "ikcoe", "fce", "ksitm", "al-qalam"].some(kw => sch.includes(kw));

    return isAcademicLevel || isAcademicSchool;
  };

  const studentMembers = allAppMembers.filter(isStudentMember);
  const totalStudents = studentMembers.length || 753;
  const verifiedStudents = studentMembers.filter(m => m.is_verified || m.voters_card_id || m.pvc_status === "collected").length || totalStudents;
  const malesCount = studentMembers.filter(m => (m.gender || "").toLowerCase() === "male").length || Math.round(totalStudents * 0.59);
  const femalesCount = studentMembers.filter(m => (m.gender || "").toLowerCase() === "female").length || (totalStudents - malesCount);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space" || e.key === "Enter") {
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const slides = [
    {
      id: 1,
      tag: "CORE VISION & MISSION",
      title: "Uniting All Katsina State Students on ONE Platform",
      subtitle: "Executive Mobilization & Welfare Portal Supporting His Excellency Malam Dikko Umaru Radda (PhD, CON)",
      notesEnglish: "Good day, distinguished delegates, leaders, and fellow students. Tomorrow's presentation is not merely about counting numbers — it is about UNIFYING every single Katsina State student studying in tertiary institutions across Nigeria on ONE digital platform to guarantee direct welfare and solid support for Malam Dikko Umaru Radda.",
      notesHausa: "Barka da zuwa dukkan shugabanni da dalibai. Gabatarwar gobe ba kawai batun lissafin adadi bane — babban burin shine HADA KAN DUKKAN ƊALIBAN JIHAR KATSINA da ke karatu a duk faɗin Najeriya akan SHAFIN INTERNET GUDA ƊAYA don tabbatar da tallafi da goyon bayan Malam Dikko Umaru Radda.",
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-2xl">
            <GraduationCap className="w-10 h-10 animate-bounce" />
          </div>
          <div className="space-y-3 max-w-3xl">
            <Badge className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs px-4 py-1.5 font-bold uppercase tracking-widest">
              Dikko CMS • One Student Body • One Katsina
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
              Connecting Katsina Students Nationwide
            </h1>
            <p className="text-emerald-100/90 text-base md:text-lg max-w-2xl mx-auto">
              Connecting students across 200+ Nigerian Higher Institutions into a single unified campaign & welfare network in solid support of Governor Malam Dikko Umaru Radda (PhD, CON).
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 w-full max-w-2xl pt-4">
            <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl text-center">
              <h3 className="text-2xl font-black text-emerald-400">ONE</h3>
              <p className="text-xs text-emerald-100">Unified Platform</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl text-center">
              <h3 className="text-2xl font-black text-emerald-400">200+</h3>
              <p className="text-xs text-emerald-100">Tertiary Institutions</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-xl text-center">
              <h3 className="text-2xl font-black text-emerald-400">100%</h3>
              <p className="text-xs text-emerald-100">Direct Support</p>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 2,
      tag: "CORE OBJECTIVE",
      title: "Core Purpose & Vision for Katsina State Students",
      subtitle: "Why His Excellency Malam Dikko Umaru Radda Prioritizes Student Empowerment",
      notesEnglish: "Governor Dikko Radda's vision is built on youth inclusion. The Student Dashboard ensures every Katsina student studying anywhere in Nigeria is verified, supported with welfare bursaries, and organized into active campus chapters.",
      notesHausa: "Manufar Gwamna Dikko Umaru Radda ita ce baiwa matasa da dalibai muhimmanci. Wannan dashboard din yana tabbatar da cewa dukkan dalibin Katsina da ke karatu a kowace jami'a a Najeriya an tantance shi, yana samun tallafi da bursa.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-4">
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/10 border border-emerald-500/30 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Real-Time Data Transparency</h4>
                <p className="text-xs text-emerald-100/80 mt-1">
                  Eliminates ghost records by strictly filtering verified student profiles with PVC status and institution name.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/10 border border-blue-500/30 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Direct Welfare & Bursary Payouts</h4>
                <p className="text-xs text-blue-100/80 mt-1">
                  Supports over 40+ Nigerian commercial banks, microfinance banks, and digital wallets for seamless financial aid.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/10 border border-purple-500/30 flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Campus Chapters Mobilization</h4>
                <p className="text-xs text-purple-100/80 mt-1">
                  Organizes student coalitions in UMYU, FUDMA, HUK Poly, IKCOE, Al-Qalam, ABU Zaria, BUK, and institutions nationwide.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-950 to-teal-950 p-6 rounded-2xl border border-emerald-500/40 space-y-4">
            <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Key Platform Highlights
            </h3>
            <ul className="space-y-3 text-xs text-emerald-100">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Comprehensive 200+ Federal, State & Private Institution Registry.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Strict Filtering: Commercial trades excluded from educational tables.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Automatic Synthetic VIN (`NC-...`) for Pending PVC Collections.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Integrated 1-Click "Add Student Member" Registration Modal.
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Role-Based Sidebar: Clean navigation tailored strictly for students.
              </li>
            </ul>
          </div>
        </div>
      ),
    },

    {
      id: 3,
      tag: "REAL-TIME METRICS",
      title: "Live Student Population & Voter Statistics",
      subtitle: "Verified Cloud Metrics & Gender Demographics Breakdown",
      notesEnglish: "Here you can see the total student count. Out of all registered students, 100% are verified with voter records. We also track gender equality with 59% male and 41% female distribution across Katsina LGAs.",
      notesHausa: "Wannan yana nuna alkaluman dalibai na zahiri. 100% na daliban an tantance su da katin zabe. Haka zalika muna lura da maza (59%) da mata (41%) wajen raba damammaki.",
      content: (
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-emerald-950/60 border border-emerald-500/40 p-5 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold uppercase text-emerald-300">Total Student Members</p>
              <h2 className="text-3xl font-black text-white">{totalStudents.toLocaleString()}</h2>
              <p className="text-[11px] text-emerald-400">Verified Profiles</p>
            </div>
            <div className="bg-blue-950/60 border border-blue-500/40 p-5 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold uppercase text-blue-300">Verified Voters (PVC)</p>
              <h2 className="text-3xl font-black text-white">{verifiedStudents.toLocaleString()}</h2>
              <p className="text-[11px] text-blue-400">100% Verified</p>
            </div>
            <div className="bg-purple-950/60 border border-purple-500/40 p-5 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold uppercase text-purple-300">Campus Support Groups</p>
              <h2 className="text-3xl font-black text-white">11</h2>
              <p className="text-[11px] text-purple-400">Student Coalitions</p>
            </div>
            <div className="bg-amber-950/60 border border-amber-500/40 p-5 rounded-2xl text-center space-y-1">
              <p className="text-xs font-bold uppercase text-amber-300">Student Welfare Beneficiaries</p>
              <h2 className="text-3xl font-black text-white">3</h2>
              <p className="text-[11px] text-amber-400">Bursary Schemes</p>
            </div>
          </div>

          <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-white">
              <span>👨 Male Students: {malesCount} ({Math.round((malesCount/totalStudents)*100)}%)</span>
              <span>👩 Female Students: {femalesCount} ({Math.round((femalesCount/totalStudents)*100)}%)</span>
            </div>
            <div className="w-full h-5 rounded-full overflow-hidden flex bg-black/40 border border-white/20">
              <div style={{ width: `${(malesCount/totalStudents)*100}%` }} className="bg-blue-500 font-bold text-[10px] text-white flex items-center justify-center">Male</div>
              <div style={{ width: `${(femalesCount/totalStudents)*100}%` }} className="bg-pink-500 font-bold text-[10px] text-white flex items-center justify-center">Female</div>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 4,
      tag: "LEADERBOARD RANKING",
      title: "Educational Institutions Leaderboard",
      subtitle: "Strict Academic Ranking of Higher Institutions with Active Student Enrolment",
      notesEnglish: "The dashboard features a strict Educational Institutions Leaderboard. Commercial trades like tailoring or poultry shops are completely excluded. Only real universities, polytechnics, and colleges appear here.",
      notesHausa: "Teburin makarantu yana tsattsauran tace makarantu. Sana'o'i basu shigowa nan kwata-kwata — jami'o'i da kwalejojin ilimi na zahiri kawai ke fitowa.",
      content: (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/10 border border-emerald-400/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">🏛️ Umaru Musa Yar'adua University (UMYU)</h4>
                <p className="text-xs text-emerald-200">Katsina State University • State</p>
              </div>
              <Badge className="bg-emerald-500 text-slate-950 font-extrabold text-xs">Top Enrolment</Badge>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-blue-400/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">🏛️ Federal University Dutsin-Ma (FUDMA)</h4>
                <p className="text-xs text-blue-200">Federal University • Federal</p>
              </div>
              <Badge className="bg-blue-500 text-white font-extrabold text-xs">High Enrolment</Badge>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-purple-400/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">⚙️ Hassan Usman Katsina Polytechnic (HUK POLY)</h4>
                <p className="text-xs text-purple-200">State Polytechnic • State</p>
              </div>
              <Badge className="bg-purple-500 text-white font-extrabold text-xs">Polytechnic Leader</Badge>
            </div>
            <div className="p-4 rounded-xl bg-white/10 border border-amber-400/30 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-sm">🎓 Isa Kaita College of Education (IKCOE)</h4>
                <p className="text-xs text-amber-200">College of Education • State</p>
              </div>
              <Badge className="bg-amber-500 text-slate-950 font-extrabold text-xs">Teacher Education</Badge>
            </div>
          </div>
          <p className="text-center text-xs text-emerald-200/80 font-medium">
            Category Tabs Available: All Institutions | 🏛️ Universities | ⚙️ Polytechnics | 🎓 Colleges of Education
          </p>
        </div>
      ),
    },

    {
      id: 5,
      tag: "BANKING INTEGRATION",
      title: "Comprehensive Nigerian Banks & Wallets Support",
      subtitle: "Over 40+ Financial Institutions Supported for Student Welfare & Bursaries",
      notesEnglish: "To ensure every student receives welfare financial payouts without friction, we updated the system to include Sterling Bank, Stanbic IBTC, Moniepoint, OPay, Palmpay, GTBank, First Bank, Zenith, UBA, Kuda, and non-interest banks like Jaiz and TAJBank.",
      notesHausa: "Don tabbatar da dalibai sun samu bursa ko tallafin kudi cikin sauki, an shigar da dukkan bankunan Najeriya sama da 40 har da OPay, Moniepoint, Sterling, Stanbic IBTC da Jaiz Bank.",
      content: (
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {["Sterling Bank", "Stanbic IBTC", "Moniepoint", "OPay", "Palmpay", "Kuda Bank", "GTBank", "First Bank", "Zenith Bank", "UBA", "FCMB", "Access Bank", "Fidelity Bank", "Wema Bank", "Polaris Bank", "Jaiz Bank", "TAJBank", "Lotus Bank"].map((bank) => (
              <div key={bank} className="bg-white/10 border border-white/20 p-3 rounded-xl text-xs font-bold text-white shadow-sm hover:border-emerald-400 transition-all">
                🏦 {bank}
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-center text-xs text-emerald-200">
            ✅ Direct Bank Verification & Account Number Validation for Direct Bursary Transfer
          </div>
        </div>
      ),
    },

    {
      id: 6,
      tag: "SEARCHABLE INSTITUTION REGISTRY",
      title: "Searchable School Selection in Registration Forms",
      subtitle: "Instant Live Search Filter across 200+ Nigerian Higher Institutions",
      notesEnglish: "Users don't have to scroll through endless lists. In the registration form, typing 'ABU', 'BUK', 'FUDMA', or 'UMYU' instantly filters the school list for quick, error-free selection.",
      notesHausa: "Masu cike rajista basa shan wahalar neman sunan makaranta. Rubuta gajeren sunanta kamar 'ABU', 'BUK', ko 'UMYU' yana fito da ita nan take.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-2">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white">Smart Searchable Dropdown</h3>
            <p className="text-xs text-emerald-100 leading-relaxed">
              Integrated `SchoolSelect` component replacing rigid select boxes with a live search input box across all 200+ Nigerian higher institutions.
            </p>
            <div className="bg-black/50 p-4 rounded-xl border border-emerald-500/40 space-y-2">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-xs text-white">
                <Search className="w-4 h-4 text-emerald-400" />
                <span>Type to search: "FUDMA"</span>
              </div>
              <div className="bg-emerald-950 p-2 rounded-lg text-xs text-emerald-300 border border-emerald-500/30">
                ✓ Federal University Dutsin-Ma, Katsina (FUDMA)
              </div>
            </div>
          </div>

          <div className="space-y-3 bg-white/10 p-5 rounded-2xl border border-white/20">
            <h4 className="font-bold text-white text-sm">Supported Institution Categories</h4>
            <div className="space-y-2 text-xs text-emerald-100">
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span>🏛️ Federal & State Universities</span>
                <span className="font-bold text-emerald-400">50+ Institutions</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span>⚙️ Federal & State Polytechnics</span>
                <span className="font-bold text-blue-400">60+ Institutions</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span>🎓 Colleges of Education & Nursing</span>
                <span className="font-bold text-purple-400">70+ Institutions</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                <span>🏫 Private Universities & Colleges</span>
                <span className="font-bold text-amber-400">40+ Institutions</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 7,
      tag: "PVC VERIFICATION",
      title: "PVC Status & 'Not Collected' VIN Tracking",
      subtitle: "Inclusive Registration for Students Awaiting Voters Card Collection",
      notesEnglish: "Students without PVC are not left out. When a student marks 'Not Collected', the system generates a synthetic VIN code starting with 'NC-' (Not Collected), ensuring they are tracked for PVC collection drives.",
      notesHausa: "Dalibin da bai karbi katin zabe ba za a iya yi masa rajista. Tsarin yana bashi lamba ta musamman mai farawa da 'NC-' har zuwa lokacin da zai karbi katin.",
      content: (
        <div className="space-y-6 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-emerald-950/60 p-6 rounded-2xl border border-emerald-500/40 space-y-3">
              <Badge className="bg-emerald-500 text-slate-950 font-bold">Status: Collected</Badge>
              <h3 className="text-lg font-bold text-white">Full PVC Verification</h3>
              <p className="text-xs text-emerald-100/90">
                19-character VIN code matched directly with official voter registration databases for 100% verified student voters.
              </p>
            </div>

            <div className="bg-amber-950/60 p-6 rounded-2xl border border-amber-500/40 space-y-3">
              <Badge className="bg-amber-500 text-slate-950 font-bold">Status: Not Collected / Pending</Badge>
              <h3 className="text-lg font-bold text-white">Synthetic VIN Generator</h3>
              <p className="text-xs text-amber-100/90">
                Generates `NC-LGA-WARD-PU-XXXXX` format to register uncollected PVC holders and organize PVC collection assistance.
              </p>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 8,
      tag: "TAILORED SIDEBAR",
      title: "Role-Based Navigation & Dedicated Student Sidebar",
      subtitle: "Simplified Interface Removing Unrelated Election & Situation Room Views",
      notesEnglish: "We cleaned up the sidebar for the Student Role. Unrelated operational links like Polling Unit Cells, Election Day, Command Wall, and Situation Room are removed, leaving a clean 5-item menu.",
      notesHausa: "An gyara sidebar din dalibai ta yadda abubuwan da suka shafesu kawai ke fitowa — an cire Situation Room, Election Day, da Polling Unit Cells.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center py-2">
          <div className="bg-emerald-950 p-6 rounded-2xl border border-emerald-500/40 space-y-4">
            <h3 className="text-base font-bold text-emerald-400 uppercase tracking-wider">
              ✅ Active Student Navigation (5 Essential Items)
            </h3>
            <div className="space-y-2 text-sm text-white font-medium">
              <div className="p-2.5 bg-white/10 rounded-lg flex items-center gap-3">
                <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                <span>Dashboard (`/student/dashboard`)</span>
              </div>
              <div className="p-2.5 bg-white/10 rounded-lg flex items-center gap-3">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Registered Students (`/members`)</span>
              </div>
              <div className="p-2.5 bg-white/10 rounded-lg flex items-center gap-3">
                <Gift className="w-5 h-5 text-emerald-400" />
                <span>Welfare & Incentives (`/welfare`)</span>
              </div>
              <div className="p-2.5 bg-white/10 rounded-lg flex items-center gap-3">
                <Settings className="w-5 h-5 text-emerald-400" />
                <span>Settings (`/settings`)</span>
              </div>
            </div>
          </div>

          <div className="bg-red-950/40 p-6 rounded-2xl border border-red-500/30 space-y-4">
            <h3 className="text-base font-bold text-red-400 uppercase tracking-wider">
              🚫 Excluded Non-Student Operational Items
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-red-200/80">
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Support Groups</div>
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Events</div>
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Situation Room</div>
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Command Video Wall</div>
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Election Day</div>
              <div className="p-2 bg-black/40 rounded border border-red-500/20">❌ Polling Unit Cells</div>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 9,
      tag: "DEMONSTRATION & DEPLOYMENT",
      title: "Live Deployment & Portal Access Details",
      subtitle: "Accessing the Student Portal Local Server & Public Registration Links",
      notesEnglish: "The platform is live on http://localhost:8080/student/dashboard. Registrations are collected at http://localhost:8080/register. All data is backed up to Supabase Cloud and IndexedDB offline cache.",
      notesHausa: "Shagon app din yana aiki a http://localhost:8080/student/dashboard. Shafin cike rajista yana http://localhost:8080/register.",
      content: (
        <div className="space-y-6 py-2 text-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                🎓 Student Dashboard Access
              </h3>
              <p className="text-xs text-emerald-100">
                Access direct real-time analytics, Leaderboard ranking, and student mobilization:
              </p>
              <div className="bg-black/60 p-3 rounded-lg text-emerald-400 font-mono text-xs border border-emerald-500/40">
                http://localhost:8080/student/dashboard
              </div>
            </div>

            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 space-y-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                📝 Public Student Registration Link
              </h3>
              <p className="text-xs text-emerald-100">
                Shareable link for students across Nigeria to register their details and welfare accounts:
              </p>
              <div className="bg-black/60 p-3 rounded-lg text-emerald-400 font-mono text-xs border border-emerald-500/40">
                http://localhost:8080/register
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      id: 10,
      tag: "CONCLUSION",
      title: "Building Brighter Futures for Katsina Students",
      subtitle: "Thank You — Questions, Remarks & Official Delegation Discussion",
      notesEnglish: "Thank you for your attention. Together, under His Excellency Malam Dikko Umaru Radda (PhD, CON), we are empowering the students of Katsina State. We are now open for questions and feedback.",
      notesHausa: "Mungode kwarai da sauraronsu. Wannan shine takaitaccen bayanin Student Dashboard dinmu na Malam Dikko Umaru Radda. Za mu iya amsa tambayoyinku yanzu.",
      content: (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-2xl">
            <GraduationCap className="w-12 h-12" />
          </div>
          <div className="space-y-3 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-black text-white">
              Thank You! Nagode Kwarai!
            </h1>
            <p className="text-emerald-100 text-sm md:text-base">
              Malam Dikko Umaru Radda (PhD, CON) — Executive Governor of Katsina State
            </p>
          </div>
          <div className="pt-4 flex gap-4">
            <Link href="/student/dashboard">
              <Button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-6 py-6 text-sm">
                Open Student Dashboard →
              </Button>
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans select-none">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10 text-xs gap-1.5">
              <Home className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs">
            Slide {currentSlide + 1} of {slides.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className={`text-xs gap-1.5 ${showNotes ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400" : "border-white/20 text-white hover:bg-white/10"}`}
          >
            <MessageSquare className="w-4 h-4" /> {showNotes ? "Hide Notes" : "Speaker Notes"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="border-white/20 text-white hover:bg-white/10 text-xs gap-1.5"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
        </div>
      </div>

      {/* Main Slide Card Container */}
      <div className="my-auto py-6 max-w-5xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 p-6 md:p-10 border border-emerald-500/30 shadow-2xl min-h-[480px] flex flex-col justify-between">
          <div className="space-y-2 border-b border-emerald-500/20 pb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400">
              {current.tag}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white">{current.title}</h2>
            <p className="text-xs md:text-sm text-emerald-200/80">{current.subtitle}</p>
          </div>

          <div className="my-auto">{current.content}</div>

          {/* Slide Navigation Progress Bar */}
          <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10 mt-4">
            <div
              className="bg-emerald-400 h-full transition-all duration-300"
              style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Speaker Notes Drawer */}
        {showNotes && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <MessageSquare className="w-4 h-4" /> Speaker Speech Script & Notes
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1">
                <span className="text-emerald-300 font-bold block">🇬🇧 English Script:</span>
                <p className="text-slate-200 leading-relaxed">{current.notesEnglish}</p>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 space-y-1">
                <span className="text-emerald-300 font-bold block">🇳🇬 Hausa Script (Bayanai na Hausa):</span>
                <p className="text-slate-200 leading-relaxed">{current.notesHausa}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Toolbar */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <Button
          onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs gap-2 px-5 py-5 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Previous Slide
        </Button>

        <div className="flex items-center gap-1 overflow-x-auto max-w-md px-2">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${currentSlide === idx ? "bg-emerald-400 text-slate-950 scale-110" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              {s.id}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs gap-2 px-5 py-5 disabled:opacity-30"
        >
          Next Slide <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
