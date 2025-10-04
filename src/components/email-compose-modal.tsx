
"use client";

import React, { useState, useEffect } from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
// Icons
import { Mail, Send, Loader2, Info } from "lucide-react";
// Types and Hooks
import type { RankedCandidate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

/**
 * Props for the EmailComposeModal component.
 */
interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: RankedCandidate[];
  jobRoleName: string;
}

// Default email templates
const defaultSubject = (jobRoleName: string) => `Update on Your Application for ${jobRoleName}`;
const defaultBody = (jobRoleName: string) => `Hi {{candidateName}},

Thank you for your interest in the ${jobRoleName} position. We were impressed with your background and would like to move forward with the next steps in our hiring process.

We will be in touch shortly to schedule an interview.

Best regards,
The Hiring Team
AI Recruiter`;


/**
 * A modal dialog for composing and sending bulk emails to selected candidates.
 * It interfaces with the /api/send-email API route.
 */
export function EmailComposeModal({ isOpen, onClose, candidates, jobRoleName }: EmailComposeModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  
  // Effect to populate the modal with a default template when it opens or candidates change.
  useEffect(() => {
    if (isOpen) {
      setSubject(defaultSubject(jobRoleName));
      setBody(defaultBody(jobRoleName));
    }
  }, [isOpen, jobRoleName, candidates]);

  /**
   * Handles the sending of the email by calling the backend API.
   */
  const handleSendEmail = async () => {
    // For this demo, we derive a placeholder email from the candidate's name.
    const recipients = candidates.map(c => ({
        name: c.name || "Candidate",
        email: `${(c.name || "candidate").toLowerCase().replace(/\s+/g, '.')}@example.com`
    }));

    if (recipients.length === 0) {
      toast({ title: "No Recipients", description: "No candidates selected to email.", variant: "destructive" });
      return;
    }
    
    setIsSending(true);
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, subject, body }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "An unknown error occurred.");
      }
      
      toast({
        title: "Emails Sent",
        description: `Your message has been queued for sending to ${result.successCount} of ${result.totalCount} recipients.`,
      });
      onClose(); // Close the modal on success.

    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send emails.";
      toast({ title: "Error Sending Email", description: message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  // Do not render if the modal is not open.
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] bg-card flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <Mail className="w-6 h-6 mr-2" /> Compose Email
          </DialogTitle>
          <DialogDescription>
            Sending to {candidates.length} candidate(s). Use `{{candidateName}}` to personalize the email body.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow space-y-4 py-4 overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSending} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea id="email-body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[250px] text-base" disabled={isSending} />
          </div>
           <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                For this demo, emails are sent to placeholder addresses derived from the candidate's name (e.g., `jane.doe@example.com`).
              </AlertDescription>
            </Alert>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button onClick={onClose} variant="outline" disabled={isSending}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={isSending || !subject || !body}>
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send to {candidates.length} Candidate(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
