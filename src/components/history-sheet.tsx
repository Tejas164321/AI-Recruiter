
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { History, Calendar, Users, ChevronRight, Trash2 } from "lucide-react";
import type { JobScreeningResult } from "@/lib/types";

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  history: JobScreeningResult[];
  onSelectSession: (session: JobScreeningResult) => void;
  onDeleteSession: (session: JobScreeningResult) => void;
  onClearAllHistory: () => void;
}

export function HistorySheet({
  isOpen,
  onClose,
  history,
  onSelectSession,
  onDeleteSession,
  onClearAllHistory
}: HistorySheetProps) {
  
  const handleSelect = (e: React.MouseEvent, session: JobScreeningResult) => {
    // Stop propagation to prevent the parent button from firing its onClick
    e.stopPropagation();
    onSelectSession(session);
  };
  
  const handleDelete = (e: React.MouseEvent, session: JobScreeningResult) => {
    e.stopPropagation();
    onDeleteSession(session);
  };

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
        <ScrollArea className="flex-grow my-4 -mr-2">
          <div className="space-y-3 pr-4">
            {history.length > 0 ? (
              history.map((session) => (
                <div key={session.id} className="relative group">
                    <button
                        onClick={(e) => handleSelect(e, session)}
                        className="w-full text-left p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors flex justify-between items-center"
                    >
                        <div className="flex-grow overflow-hidden pr-8">
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
                        <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-1 shrink-0" />
                    </button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(e, session)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive"
                        aria-label="Delete session"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>No history yet.</p>
                <p className="text-sm">Complete a screening to see it here.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        {history.length > 0 && (
          <SheetFooter>
            <Button variant="destructive" className="w-full" onClick={onClearAllHistory}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All History
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

    