
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { History, Calendar, Users, ChevronRight } from "lucide-react";
import type { JobScreeningResult } from "@/lib/types";

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  history: JobScreeningResult[];
  onSelectSession: (session: JobScreeningResult) => void;
}

export function HistorySheet({ isOpen, onClose, history, onSelectSession }: HistorySheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md w-full flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center text-xl font-headline text-primary">
            <History className="w-6 h-6 mr-2" />
            Screening History
          </SheetTitle>
          <SheetDescription>
            Select a past session to view its results.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow my-4">
          <div className="space-y-3 pr-4">
            {history.length > 0 ? (
              history.map((session) => (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-grow">
                      <p className="font-semibold text-foreground truncate" title={session.jobDescriptionName}>
                        {session.jobDescriptionName}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1 space-y-1">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1.5" />
                          {session.createdAt.toDate().toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-3 h-3 mr-1.5" />
                          {session.candidates.length} candidate(s)
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>No history yet.</p>
                <p className="text-sm">Complete a screening to see it here.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
