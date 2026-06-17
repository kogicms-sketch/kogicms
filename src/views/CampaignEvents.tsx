"use client";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  MapPin,
  Users,
  Star,
  Clock,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Megaphone
} from "lucide-react";
import { useCampaignEvents, EVENT_TYPE_LABELS, EVENT_IMPORTANCE_COLORS } from "@/hooks/useCampaignEvents";

import { KATSINA_LGAS, ALL_WARDS } from "@/data/aggregated_lga_data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EventCreationForm } from "@/components/events/EventCreationForm";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const CampaignEvents = () => {
  const router = useRouter();
  const navigate = (path, options) => { if (path === -1) router.back(); else router.push(path); };
  const { role } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    eventType: "",
    importance: "",
    lga: "",
    ward: "",
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const { data: events, isLoading } = useCampaignEvents({
    startDate: format(monthStart, "yyyy-MM-dd"),
    endDate: format(monthEnd, "yyyy-MM-dd"),
    eventType: filters.eventType || undefined,
    importance: filters.importance || undefined,
    lga: filters.lga || undefined,
  });

  const filteredEvents = events?.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.lga?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (filters.ward && (event.location?.toLowerCase().includes(filters.ward.toLowerCase()) || event.title.toLowerCase().includes(filters.ward.toLowerCase())))
  );

  // Calendar days
  const calendarDays = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  const getEventsForDay = (date: Date) => {
    return filteredEvents?.filter(event =>
      event.scheduled_date && isSameDay(new Date(event.scheduled_date), date)
    ) || [];
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const isAdmin = role === "super_admin" || role === "org_admin";

  return (
    <DashboardLayout
      title="Campaign Events"
      subtitle="Manage rallies, town halls, and campaign activities"
    >
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Button
              variant={view === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("calendar")}
              className={view === "calendar" ? "bg-[hsl(var(--apc-green))]" : ""}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendar
            </Button>
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
              className={view === "list" ? "bg-[hsl(var(--apc-green))]" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              List
            </Button>
          </div>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isAdmin && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-action">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Campaign Event</DialogTitle>
                  <DialogDescription>
                    Schedule a new rally, town hall, or campaign activity.
                  </DialogDescription>
                </DialogHeader>
                <EventCreationForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Select value={filters.eventType || "all"} onValueChange={(v) => setFilters(f => ({ ...f, eventType: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.importance || "all"} onValueChange={(v) => setFilters(f => ({ ...f, importance: v === "all" ? "" : v }))}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Importance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.lga || "all"} onValueChange={(v) => setFilters(f => ({ ...f, lga: v === "all" ? "" : v, ward: "" }))}>
          <SelectTrigger className="w-[180px]">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by LGA" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All LGAs</SelectItem>
            {KATSINA_LGAS.map(lga => (
              <SelectItem key={lga} value={lga}>{lga}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.ward || "all"}
          onValueChange={(v) => setFilters(f => ({ ...f, ward: v === "all" ? "" : v }))}
          disabled={!filters.lga}
        >
          <SelectTrigger className="w-[180px]">
            <MapPin className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by Ward" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {filters.lga && ALL_WARDS
              .filter(w => w.lga === filters.lga)
              .map(ward => (
                <SelectItem key={ward.id} value={ward.name}>{ward.name}</SelectItem>
              ))
            }
          </SelectContent>
        </Select>
      </div>

      {/* Calendar View */}
      {view === "calendar" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-xl">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Header */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="bg-muted p-3 text-center text-sm font-medium">
                  {day}
                </div>
              ))}

              {/* Days */}
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <div
                    key={idx}
                    className={`bg-card min-h-[100px] p-2 ${!isSameMonth(day, currentMonth) ? "bg-muted/50" : ""
                      } ${isToday(day) ? "bg-[hsl(var(--apc-green))]/5" : ""}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday(day) ? "text-[hsl(var(--apc-green))]" : ""
                      }`}>
                      {format(day, "d")}
                    </div>

                    {hasEvents && (
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event, eidx) => (
                          <button
                            key={eidx}
                            onClick={() => navigate(`/events/${event.id}`)}
                            className={`w-full text-left text-xs p-1 rounded ${EVENT_IMPORTANCE_COLORS[(event as any).importance || "normal"]
                              } text-white truncate hover:opacity-80 transition-opacity`}
                          >
                            {event.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">Loading events...</div>
          ) : filteredEvents?.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "No events match your search." : "Create your first campaign event."}
              </p>
            </Card>
          ) : (
            filteredEvents?.map((event) => (
              <Card
                key={event.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Date Badge */}
                    <div className="flex items-center lg:flex-col gap-2 lg:gap-0 lg:w-16 shrink-0">
                      <div className="text-2xl font-bold">
                        {event.scheduled_date ? format(new Date(event.scheduled_date), "dd") : "--"}
                      </div>
                      <div className="text-sm text-muted-foreground lg:text-center">
                        {event.scheduled_date ? format(new Date(event.scheduled_date), "MMM") : ""}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {EVENT_TYPE_LABELS[(event as any).event_type as keyof typeof EVENT_TYPE_LABELS] || "Event"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(event as any).candidate_attending && (
                            <Badge className="bg-[hsl(var(--apc-green))] text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Candidate
                            </Badge>
                          )}
                          <Badge className={EVENT_IMPORTANCE_COLORS[(event as any).importance || "normal"]}>
                            {(event as any).importance || "normal"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {event.start_time || "TBD"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location || "Location TBD"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {event.expected_attendance || 0} expected
                        </span>
                        {(event as any).broadcast_sent && (
                          <span className="flex items-center gap-1 text-green-500">
                            <Megaphone className="w-4 h-4" />
                            Broadcast sent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CampaignEvents;
