
"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadArea } from "@/components/file-upload-area";
import { FeedbackModal } from "@/components/feedback-modal";
import { EmailComposeModal } from "@/components/email-compose-modal";
// Icons
import { Users, ScanSearch, Briefcase, ServerOff } from "lucide-react";
// Hooks and Contexts
import { useLoading } from "@/contexts/loading-context";
import { useAuth } from "@/contexts/auth-context";
// Types
import type { ResumeFile, RankedCandidate, JobDescriptionFile } from "@/lib/types";

// Max file size for uploads
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Resume Ranker Page Component.
 * This is the core feature page where users can upload JDs and resumes.
 * NOTE: Core logic has been temporarily removed to fix a critical loading issue.
 */
export default function ResumeRankerPage() {
  const { setAppIsLoading } = useLoading();
  const { currentUser } = useAuth();

  // State for file uploads in the current session
  const [uploadedResumeFiles, setUploadedResumeFiles] = useState<ResumeFile[]>([]);
  const [uploadedJdFiles, setUploadedJdFiles] = useState<JobDescriptionFile[]>([]);

  // State for modals
  const [selectedCandidateForFeedback, setSelectedCandidateForFeedback] = useState<RankedCandidate | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [candidatesForEmail, setCandidatesForEmail] = useState<RankedCandidate[]>([]);


  // Turn off the global page loader as soon as the component mounts.
  useEffect(() => {
    setAppIsLoading(false);
  }, [setAppIsLoading]);

  // Dummy handler for JDs - will be reimplemented
  const handleJobDescriptionUpload = useCallback(async (files: File[]) => {
      const newJdFiles = files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name }));
      setUploadedJdFiles(newJdFiles);
  }, []);

  // Dummy handler for Resumes - will be reimplemented
  const handleResumesUpload = useCallback(async (files: File[]) => {
     const newResumeFiles = files.map(f => ({ id: crypto.randomUUID(), file: f, dataUri: '', name: f.name }));
     setUploadedResumeFiles(newResumeFiles);
  }, []); 

  // If the user is not logged in, show a message.
  if (!currentUser) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
        <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
                <p className="text-lg text-muted-foreground">
                    Please <a href="/login" className="text-primary underline">log in</a> to use the Resume Ranker.
                </p>
            </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 pt-24">
       <Card className="mb-8 shadow-md"><CardHeader><CardTitle className="text-2xl font-headline text-primary flex items-center"><ScanSearch className="w-7 h-7 mr-3" /> AI-Powered Resume Ranker</CardTitle><CardDescription>Upload job descriptions and resumes to screen candidates.</CardDescription></CardHeader></Card>

        <>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Briefcase className="w-6 h-6 mr-3 text-primary" />Upload Job Descriptions</CardTitle><CardDescription>Upload one or more JD files.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleJobDescriptionUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple={true} label="PDF, TXT, DOC, DOCX files up to 5MB" id="job-description-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
            <div className="flex-1"><Card className="shadow-lg h-full"><CardHeader><CardTitle className="flex items-center text-xl font-headline"><Users className="w-6 h-6 mr-3 text-primary" />Upload Resumes</CardTitle><CardDescription>Upload candidate resumes to be screened.</CardDescription></CardHeader><CardContent><FileUploadArea onFilesUpload={handleResumesUpload} acceptedFileTypes={{ "application/pdf": [".pdf"], "text/plain": [".txt"],"application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}} multiple label="PDF, TXT, DOC, DOCX files up to 5MB" id="resume-upload" maxSizeInBytes={MAX_FILE_SIZE_BYTES}/></CardContent></Card></div>
          </div>
          
          <div className="flex justify-center pt-4">
            <Button onClick={() => {}} disabled={true} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground text-base px-8 py-6 shadow-md">
              <ScanSearch className="w-5 h-5 mr-2" />
              Screen Resumes (Temporarily Disabled)
            </Button>
          </div>
          
          <div className="space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl font-headline text-primary">Results</CardTitle>
                    <CardDescription>Screening functionality is temporarily disabled to resolve a loading issue. Please check back later.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">Upload files above and click "Screen Resumes" to see results here.</p>
                </CardContent>
            </Card>
          </div>

          <FeedbackModal isOpen={isFeedbackModalOpen} onClose={() => setIsFeedbackModalOpen(false)} candidate={selectedCandidateForFeedback}/>
          <EmailComposeModal 
            isOpen={isEmailModalOpen} 
            onClose={() => setIsEmailModalOpen(false)} 
            candidates={candidatesForEmail}
            jobRoleName={""}
          />
        </>
    </div>
  );
}
