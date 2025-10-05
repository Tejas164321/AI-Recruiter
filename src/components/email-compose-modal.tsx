
"use client";

import React, { useState, useEffect } from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      // When the modal opens, populate the templates with the job title
      setSubject(DEFAULT_SUBJECT_TEMPLATE.replace("{{jobTitle}}", jobTitle));
      setBody(DEFAULT_BODY_TEMPLATE.replace(/{{jobTitle}}/g, jobTitle));
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
    } finally {
      setIsSending(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] bg-card flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center">
            <Mail className="w-6 h-6 mr-2" /> Compose Email
          </DialogTitle>
          <DialogDescription>
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
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
