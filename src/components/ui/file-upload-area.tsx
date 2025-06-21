
"use client";

import { UploadCloud, FileText, XCircle } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface FileUploadAreaProps {
  onFilesUpload: (files: File[]) => void;
  acceptedFileTypes: Accept;
  multiple?: boolean;
  label: string;
  id: string;
  maxSizeInBytes?: number; // New prop for max file size
}

export function FileUploadArea({
  onFilesUpload,
  acceptedFileTypes,
  multiple = false,
  label,
  id,
  maxSizeInBytes, // Destructure new prop
}: FileUploadAreaProps) {
  // We no longer need to manage a list of files visually inside this component
  // because the parent component now controls the primary display (e.g., a textarea).
  // This component becomes a "trigger" for the onFilesUpload callback.

  const { toast } = useToast(); // Initialize useToast

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Handle rejected files (e.g., due to size)
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === "file-too-large") {
            toast({
              title: "File Rejected",
              description: `File "${file.name}" is too large. Maximum size is ${maxSizeInBytes ? (maxSizeInBytes / (1024 * 1024)).toFixed(0) : 'N/A'}MB.`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "File Rejected",
              description: `Could not upload "${file.name}": ${error.message}`,
              variant: "destructive",
            });
          }
        });
      });

      // Process accepted files by calling the callback
      if (acceptedFiles.length > 0) {
        onFilesUpload(acceptedFiles);
      }
    },
    [onFilesUpload, toast, maxSizeInBytes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple,
    maxSize: maxSizeInBytes, // Pass maxSize to useDropzone
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex flex-col items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors",
        isDragActive ? "border-primary bg-primary/10" : "border-border",
        "bg-card"
      )}
      aria-labelledby={`${id}-label`}
    >
      <input {...getInputProps()} id={id} />
      <UploadCloud className="w-10 h-10 mb-3 text-muted-foreground" />
      <p id={`${id}-label`} className="mb-2 text-sm text-foreground">
        <span className="font-semibold">Click to upload a file</span> or drag and drop
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {isDragActive && (
        <p className="mt-2 text-sm text-primary">Drop the file here ...</p>
      )}
    </div>
  );
}
