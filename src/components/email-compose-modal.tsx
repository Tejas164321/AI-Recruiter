"use client";

import React, { useState, useEffect } from "react";
// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Icons
import { Mail, Send, Loader2, Info, UserCheck, UserX, FileText, Sparkles } from "lucide-react";

export interface EmailRecipient {
  name: string;
  email: string;
}

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobTitle: string;
  mode: 'single' | 'bulk';
  recipients?: EmailRecipient[]; // Used in single mode
  shortlistedRecipients?: EmailRecipient[]; // Used in bulk mode
  declinedRecipients?: EmailRecipient[]; // Used in bulk mode
}

// ============================================
// Email Templates
// ============================================

const TEMPLATE_DEFAULT_SUBJECT = "Regarding your application for {{jobTitle}}";
const TEMPLATE_DEFAULT_BODY = `
<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position. We appreciate you taking the time to share your qualifications with us.</p>
<p>We are currently reviewing all applications and will be in touch with you regarding next steps.</p>
<p>Best regards,</p>
<p>The Hiring Team</p>
`.trim();

const TEMPLATE_SHORTLIST_SUBJECT = "Application Update: Shortlisted for {{jobTitle}}";
const TEMPLATE_SHORTLIST_BODY = `
<p>Dear {{candidateName}},</p>
<p>We are pleased to inform you that your application for the <strong>{{jobTitle}}</strong> position has been shortlisted!</p>
<p>Our team was highly impressed by your experience and background. We would love to schedule a time for an initial technical screening interview to discuss the opportunity further.</p>
<p>A recruiter from our team will reach out to you shortly with scheduling options.</p>
<p>Best regards,</p>
<p>The Hiring Team</p>
`.trim();

const TEMPLATE_DECLINE_SUBJECT = "Update on your application for {{jobTitle}}";
const TEMPLATE_DECLINE_BODY = `
<p>Dear {{candidateName}},</p>
<p>Thank you for your interest in the <strong>{{jobTitle}}</strong> position and for taking the time to apply.</p>
<p>We received a large number of applications from highly qualified candidates. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time as we are proceeding with candidates whose skills align more closely with our immediate requirements.</p>
<p>We will keep your profile in our system for future opportunities that match your background. We wish you the very best in your search.</p>
<p>Best regards,</p>
<p>The Hiring Team</p>
`.trim();

export function EmailComposeModal({
  isOpen,
  onClose,
  jobTitle,
  mode,
  recipients = [],
  shortlistedRecipients = [],
  declinedRecipients = []
}: EmailComposeModalProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const formattedJobTitle = jobTitle || "the position";

  // Single mode state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Bulk mode states
  const [shortlistSubject, setShortlistSubject] = useState("");
  const [shortlistBody, setShortlistBody] = useState("");
  const [sendShortlist, setSendShortlist] = useState(true);

  const [declineBody, setDeclineBody] = useState("");
  const [declineSubjectText, setDeclineSubjectText] = useState("");
  const [sendDecline, setSendDecline] = useState(true);

  // Initialize/Reset templates when modal opens
  useEffect(() => {
    if (isOpen) {
      // Initialize single mode
      setSubject(TEMPLATE_DEFAULT_SUBJECT.replace("{{jobTitle}}", formattedJobTitle));
      setBody(TEMPLATE_DEFAULT_BODY.replace(/{{jobTitle}}/g, formattedJobTitle));

      // Initialize bulk mode
      setShortlistSubject(TEMPLATE_SHORTLIST_SUBJECT.replace("{{jobTitle}}", formattedJobTitle));
      setShortlistBody(TEMPLATE_SHORTLIST_BODY.replace(/{{jobTitle}}/g, formattedJobTitle));

      setDeclineSubjectText(TEMPLATE_DECLINE_SUBJECT.replace("{{jobTitle}}", formattedJobTitle));
      setDeclineBody(TEMPLATE_DECLINE_BODY.replace(/{{jobTitle}}/g, formattedJobTitle));

      // Reset send toggles
      setSendShortlist(true);
      setSendDecline(true);
    }
  }, [isOpen, formattedJobTitle]);

  // Template pre-fill loaders for Single Mode
  const loadTemplate = (type: "default" | "shortlist" | "decline") => {
    let subTpl = "";
    let bodyTpl = "";

    switch (type) {
      case "shortlist":
        subTpl = TEMPLATE_SHORTLIST_SUBJECT;
        bodyTpl = TEMPLATE_SHORTLIST_BODY;
        break;
      case "decline":
        subTpl = TEMPLATE_DECLINE_SUBJECT;
        bodyTpl = TEMPLATE_DECLINE_BODY;
        break;
      default:
        subTpl = TEMPLATE_DEFAULT_SUBJECT;
        bodyTpl = TEMPLATE_DEFAULT_BODY;
    }

    setSubject(subTpl.replace("{{jobTitle}}", formattedJobTitle));
    setBody(bodyTpl.replace(/{{jobTitle}}/g, formattedJobTitle));

    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Template Loaded`,
      description: "Subject and body pre-filled with template.",
    });
  };

  const sendEmailBatch = async (recipientsList: EmailRecipient[], sub: string, content: string) => {
    const validRecipients = recipientsList.map(r => ({
      name: r.name || "Candidate",
      email: r.email,
    })).filter(r => r.email);

    if (validRecipients.length === 0) return;

    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: validRecipients, subject: sub, body: content }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Failed to send emails.");
    }
    return result;
  };

  const handleSendEmails = async () => {
    setIsSending(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      if (mode === "single") {
        if (recipients.length === 0) {
          toast({ title: "No Recipient", description: "There is no candidate to email.", variant: "destructive" });
          setIsSending(false);
          return;
        }
        await sendEmailBatch(recipients, subject, body);
        toast({ title: "Email Sent Successfully", description: `Sent email to ${recipients[0].name || "candidate"}.` });
        onClose();
      } else {
        // Bulk Mode
        const promises: Promise<any>[] = [];

        if (sendShortlist && shortlistedRecipients.length > 0) {
          promises.push(
            sendEmailBatch(shortlistedRecipients, shortlistSubject, shortlistBody)
              .then(() => { successCount += shortlistedRecipients.length; })
              .catch((err) => {
                failedCount += shortlistedRecipients.length;
                console.error("Shortlist email failure:", err);
              })
          );
        }

        if (sendDecline && declinedRecipients.length > 0) {
          promises.push(
            sendEmailBatch(declinedRecipients, declineSubjectText, declineBody)
              .then(() => { successCount += declinedRecipients.length; })
              .catch((err) => {
                failedCount += declinedRecipients.length;
                console.error("Decline email failure:", err);
              })
          );
        }

        if (promises.length === 0) {
          toast({ title: "No Groups Selected", description: "Please enable at least one candidate group to email.", variant: "destructive" });
          setIsSending(false);
          return;
        }

        await Promise.all(promises);

        if (failedCount > 0) {
          toast({
            title: "Outreach Complete with Warnings",
            description: `Successfully sent ${successCount} emails. Failed to send ${failedCount} emails.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Outreach Complete!",
            description: `Successfully sent ${successCount} candidate emails.`,
          });
        }
        onClose();
      }
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Error Sending Emails",
        description: error.message || "An unknown error occurred while sending.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-card flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary flex items-center gap-2">
            <Mail className="w-6 h-6" />
            {mode === 'single' ? "Outreach: Individual Candidate" : "Automated Bulk Outreach"}
          </DialogTitle>
          <DialogDescription>
            {mode === 'single'
              ? `Review or pre-fill the email template for ${recipients[0]?.name || "the candidate"} for the ${formattedJobTitle} role.`
              : `Send distinct templates to shortlisted and declined candidates for ${formattedJobTitle} in one action.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow space-y-4 py-2">
          {mode === 'single' ? (
            // ============================================
            // INDIVIDUAL EMAIL COMPOSITION VIEW
            // ============================================
            <div className="space-y-4">
              {/* Template Selection Toolbar */}
              <div className="bg-muted/40 p-3 rounded-lg border flex flex-col gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary animate-pulse" /> Pre-fill Templates
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadTemplate("default")} disabled={isSending}>
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> General
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadTemplate("shortlist")} disabled={isSending} className="hover:border-accent hover:text-accent">
                    <UserCheck className="w-3.5 h-3.5 mr-1.5 text-accent" /> Shortlist
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadTemplate("decline")} disabled={isSending} className="hover:border-destructive hover:text-destructive">
                    <UserX className="w-3.5 h-3.5 mr-1.5 text-destructive" /> Decline
                  </Button>
                </div>
              </div>

              {/* Composition Inputs */}
              <div className="space-y-2">
                <div className="flex items-center text-sm font-semibold gap-2 border-b pb-2">
                  <span className="text-muted-foreground">To:</span>
                  <span className="text-foreground">{recipients[0]?.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">({recipients[0]?.email})</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isSending} />
              </div>

              <div className="space-y-2 flex flex-col">
                <Label htmlFor="body">Email Body (HTML supported)</Label>
                <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[250px] font-sans" disabled={isSending} />
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>Use <code>{"{{candidateName}}"}</code> to insert the candidate's name.</span>
                </div>
              </div>
            </div>
          ) : (
            // ============================================
            // BULK EMAIL COMPOSITION VIEW (SHORTLIST vs DECLINE)
            // ============================================
            <Tabs defaultValue="shortlist" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted">
                <TabsTrigger value="shortlist" className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-accent" />
                  Shortlisted ({shortlistedRecipients.length})
                </TabsTrigger>
                <TabsTrigger value="decline" className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-destructive" />
                  Declined ({declinedRecipients.length})
                </TabsTrigger>
              </TabsList>

              {/* SHORTLIST TAB CONTENT */}
              <TabsContent value="shortlist" className="space-y-4 outline-none">
                <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/20 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="send-shortlist-check" className="text-sm font-semibold cursor-pointer">
                      Send to shortlisted candidates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to email the {shortlistedRecipients.length} candidate(s) currently matching filters.
                    </p>
                  </div>
                  <Checkbox
                    id="send-shortlist-check"
                    checked={sendShortlist}
                    onCheckedChange={(checked) => setSendShortlist(!!checked)}
                    disabled={isSending || shortlistedRecipients.length === 0}
                  />
                </div>

                {sendShortlist && shortlistedRecipients.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shortlist-subject">Shortlist Email Subject</Label>
                      <Input id="shortlist-subject" value={shortlistSubject} onChange={(e) => setShortlistSubject(e.target.value)} disabled={isSending} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shortlist-body">Shortlist Email Body</Label>
                      <Textarea id="shortlist-body" value={shortlistBody} onChange={(e) => setShortlistBody(e.target.value)} className="min-h-[200px]" disabled={isSending} />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-mono text-muted-foreground uppercase">Recipient Preview</Label>
                      <div className="border rounded-md p-2 bg-muted/30 max-h-[90px] overflow-y-auto text-xs space-y-1">
                        {shortlistedRecipients.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-muted-foreground">
                            <span className="font-semibold text-foreground">{c.name}</span>
                            <span>{c.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {shortlistedRecipients.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No candidates are currently filtered/shortlisted.
                  </div>
                )}
              </TabsContent>

              {/* DECLINE TAB CONTENT */}
              <TabsContent value="decline" className="space-y-4 outline-none">
                <div className="flex items-center justify-between p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="send-decline-check" className="text-sm font-semibold cursor-pointer">
                      Send regret emails to remaining candidates
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to email the {declinedRecipients.length} candidate(s) who did not pass filters.
                    </p>
                  </div>
                  <Checkbox
                    id="send-decline-check"
                    checked={sendDecline}
                    onCheckedChange={(checked) => setSendDecline(!!checked)}
                    disabled={isSending || declinedRecipients.length === 0}
                  />
                </div>

                {sendDecline && declinedRecipients.length > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="decline-subject">Decline Email Subject</Label>
                      <Input id="decline-subject" value={declineSubjectText} onChange={(e) => setDeclineSubjectText(e.target.value)} disabled={isSending} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="decline-body">Decline Email Body</Label>
                      <Textarea id="decline-body" value={declineBody} onChange={(e) => setDeclineBody(e.target.value)} className="min-h-[200px]" disabled={isSending} />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-mono text-muted-foreground uppercase">Recipient Preview</Label>
                      <div className="border rounded-md p-2 bg-muted/30 max-h-[90px] overflow-y-auto text-xs space-y-1">
                        {declinedRecipients.map((c, i) => (
                          <div key={i} className="flex justify-between items-center text-muted-foreground">
                            <span className="font-semibold text-foreground">{c.name}</span>
                            <span>{c.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {declinedRecipients.length === 0 && (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed rounded-lg">
                    No candidates are remaining/declined. (All candidates passed the filters).
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          <Button onClick={onClose} variant="outline" disabled={isSending}>Cancel</Button>
          <Button
            onClick={handleSendEmails}
            disabled={
              isSending ||
              (mode === 'single' && recipients.length === 0) ||
              (mode === 'bulk' && !sendShortlist && !sendDecline) ||
              (mode === 'bulk' && sendShortlist && shortlistedRecipients.length === 0 && !sendDecline) ||
              (mode === 'bulk' && sendDecline && declinedRecipients.length === 0 && !sendShortlist)
            }
          >
            {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {mode === 'single' ? "Send Email" : `Send Bulk (${
              (sendShortlist ? shortlistedRecipients.length : 0) +
              (sendDecline ? declinedRecipients.length : 0)
            })`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}