"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
}

export function ScheduleModal({ open, onOpenChange, defaultTitle = "Interview Session" }: ScheduleModalProps) {
  const [date, setDate] = useState("");
  
  const handleSchedule = () => {
    if (!date) {
      toast.error("Please select a date and time.");
      return;
    }

    try {
      // Mock saving to local storage for the dashboard to read
      const existing = localStorage.getItem("mockmate-scheduled-sessions");
      const sessions = existing ? JSON.parse(existing) : [];
      sessions.push({
        id: crypto.randomUUID(),
        title: defaultTitle,
        scheduledFor: new Date(date).toISOString(),
        createdAt: new Date().toISOString()
      });
      localStorage.setItem("mockmate-scheduled-sessions", JSON.stringify(sessions));
      
      toast.success("Session scheduled successfully!");
      onOpenChange(false);
      setDate("");
    } catch (err) {
      toast.error("Failed to schedule session.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule for Later</DialogTitle>
          <DialogDescription>
            Choose a date and time to schedule your {defaultTitle}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="datetime" className="text-sm font-medium">Date & Time</label>
            <Input 
              id="datetime"
              type="datetime-local" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSchedule}>Confirm Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
