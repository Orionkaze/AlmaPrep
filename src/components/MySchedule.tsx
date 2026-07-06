"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ScheduledSession {
  id: string;
  title: string;
  scheduledFor: string;
  createdAt: string;
}

export function MySchedule() {
  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mockmate-scheduled-sessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        const sorted = parsed.sort((a: any, b: any) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
        setSessions(sorted);
      }
    } catch (err) {
      console.error("Failed to parse scheduled sessions", err);
    }
  }, []);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Filter upcoming sessions for the list
  const upcomingSessions = sessions.filter(s => new Date(s.scheduledFor) >= new Date());

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 w-full">
      {/* Calendar Column */}
      <Card className="md:col-span-1 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 font-serif">
              <CalendarIcon size={18} className="text-primary" />
              Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold min-w-[100px] text-center">
                {monthNames[month]} {year}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-muted rounded-md transition-colors cursor-pointer">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
              <div key={d} className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const dateString = new Date(year, month, day).toISOString().split('T')[0];
              const hasSession = sessions.some(s => s.scheduledFor.startsWith(dateString));
              const isToday = new Date().toISOString().split('T')[0] === dateString;

              return (
                <div 
                  key={day} 
                  className={`h-8 flex items-center justify-center rounded-md text-xs font-medium cursor-pointer transition-colors
                    ${isToday ? 'bg-primary text-primary-foreground font-bold shadow-sm' : ''}
                    ${!isToday && hasSession ? 'bg-primary/15 text-primary font-bold' : ''}
                    ${!isToday && !hasSession ? 'hover:bg-muted text-foreground' : ''}
                  `}
                >
                  {day}
                  {hasSession && !isToday && <span className="absolute w-1 h-1 bg-primary rounded-full bottom-1" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Sessions List */}
      <Card className="md:col-span-2 shadow-sm relative overflow-hidden">
         <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2 font-serif">
            Upcoming Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingSessions.length > 0 ? (
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
              {upcomingSessions.map((session) => {
                const sessionDate = new Date(session.scheduledFor);
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 border border-border rounded-xl bg-card hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/10 rounded-lg text-primary">
                        <span className="text-xs font-bold uppercase">{monthNames[sessionDate.getMonth()].slice(0, 3)}</span>
                        <span className="text-lg font-black leading-none">{sessionDate.getDate()}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">{session.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={12} />
                            {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Badge variant="secondary" className="text-[9px] h-4 py-0">Scheduled</Badge>
                        </div>
                      </div>
                    </div>
                    <Link href="/interview/setup" className="inline-flex items-center justify-center p-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-center border-2 border-dashed border-border rounded-xl bg-muted/20">
              <CalendarIcon size={32} className="text-muted-foreground/50 mb-3" />
              <p className="text-sm font-semibold text-foreground">No upcoming sessions</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                Schedule a mock interview or coding challenge to stay on track.
              </p>
              <Link href="/interview/setup" className="mt-4 text-xs font-bold text-primary hover:underline">
                Schedule a Session →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
