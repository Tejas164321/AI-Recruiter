
"use client";

import React, { useState, useEffect } from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
<<<<<<< HEAD
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
=======
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
// Icons
import { Mail, Send, Loader2, Info } from "lucide-react";

export interface EmailRecipient {
  name: string;
  email: string;
}

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipients: EmailRecipient[];
  jobTitle: string;
}

const DEFAULT_SUBJECT_TEMPLATE = "Regarding Your Application for {{jobTitle}}";
const DEFAULT_BODY_TEMPLATE = `
<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position at our company. We were impressed with your resume and would like to move forward with the next steps in our hiring process.</p>
<p>We will be in touch shortly with more details.</p>
<p>Best regards,</p>
<p>The Hiring Team</p>
`;

export function EmailComposeModal({ isOpen, onClose, recipients, jobTitle }: EmailComposeModalProps) {
>>>>>>> mail-service-and-navbar--implemented
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
<<<<<<< HEAD
  
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
    // Construct the recipients list, ensuring a fallback for the name and creating a placeholder email.
    const recipients = candidates.map(c => ({
        name: c.name || "Student", // Fallback to "Student" if name is missing.
        email: `${(c.name || "student").toLowerCase().replace(/[^a-z0-9]/g, '.')}@example.com`
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
=======

  useEffect(() => {
    if (isOpen) {
      // When the modal opens, populate the templates with the job title
      setSubject(DEFAULT_SUBJECT_TEMPLATE.replace("{{jobTitle}}", jobTitle || "the position"));
      setBody(DEFAULT_BODY_TEMPLATE.replace(/{{jobTitle}}/g, jobTitle || "the position"));
    }
  }, [isOpen, jobTitle]);

  const handleSendEmail = async () => {
    if (recipients.length === 0) {
      toast({ title: "No Recipients", description: "There are no candidates to email.", variant: "destructive" });
      return;
    }
    
    // Ensure every recipient has a valid name and email
    const validRecipients = recipients.map(r => ({
        name: r.name || "Candidate",
        email: r.email,
    })).filter(r => r.email);

    if (validRecipients.length !== recipients.length) {
        toast({ title: "Missing Information", description: "Some candidates are missing an email address.", variant: "destructive" });
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipients: validRecipients, subject, body }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to send emails.");
      }

      toast({
        title: "Emails Sent Successfully",
        description: result.message,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Sending Emails",
        description: message,
        variant: "destructive",
      });
>>>>>>> mail-service-and-navbar--implemented
    } finally {
      setIsSending(false);
    }
  };
<<<<<<< HEAD

  // Do not render if the modal is not open.
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] bg-card flex flex-col">
=======
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] bg-card flex flex-col">
>>>>>>> mail-service-and-navbar--implemented
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <Mail className="w-6 h-6 mr-2" /> Compose Email
          </DialogTitle>
          <DialogDescription>
<<<<<<< HEAD
            Sending to {candidates.length} candidate(s). Use `{{'{'}}{{candidateName}}{'}'}}` to personalize the email body.
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
                For this demo, emails are sent to placeholder addresses derived from the candidate's name (e.g., `john.doe@example.com`).
              </AlertDescription>
            </Alert>
        </div>
        
        <DialogFooter className="mt-auto pt-4 border-t border-border">
          <Button onClick={onClose} variant="outline" disabled={isSending}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={isSending || !subject || !body}>
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send to {candidates.length} Candidate(s)
=======
            Sending to {recipients.length} candidate(s) for the {jobTitle} role.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow space-y-4 overflow-hidden flex flex-col">
            <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSending}/>
            </div>
            <div className="space-y-2 flex-grow flex flex-col">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="flex-grow min-h-[250px]" disabled={isSending}/>
                <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Info className="w-3 h-3" />
                    <span>Use <code>{"{{candidateName}}"}</code> for personalization.</span>
                </div>
            </div>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={onClose} variant="outline" disabled={isSending}>Cancel</Button>
          <Button onClick={handleSendEmail} disabled={isSending || recipients.length === 0}>
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send Email
>>>>>>> mail-service-and-navbar--implemented
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
