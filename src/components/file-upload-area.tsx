
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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

      // Process accepted files
      if (acceptedFiles.length > 0) {
        const newFiles = multiple ? [...uploadedFiles, ...acceptedFiles] : acceptedFiles;
        const uniqueNewFiles = newFiles.filter(
          (file, index, self) => index === self.findIndex((f) => f.name === file.name)
        );
        setUploadedFiles(uniqueNewFiles);
        onFilesUpload(uniqueNewFiles);
      }
    },
    [onFilesUpload, multiple, uploadedFiles, toast, maxSizeInBytes]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple,
    maxSize: maxSizeInBytes, // Pass maxSize to useDropzone
  });

  const removeFile = (fileName: string) => {
    const newFiles = uploadedFiles.filter((file) => file.name !== fileName);
    setUploadedFiles(newFiles);
    onFilesUpload(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-border",
          "bg-card"
        )}
        aria-labelledby={`${id}-label`}
      >
        <input {...getInputProps()} id={id} />
        <UploadCloud className="w-12 h-12 mb-3 text-muted-foreground" />
        <p id={`${id}-label`} className="mb-2 text-sm text-foreground">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {isDragActive && (
          <p className="mt-2 text-sm text-primary">Drop the files here ...</p>
        )}
      </div>
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Uploaded files:</h4>
          <ScrollArea className="max-h-28 w-full">
            <ul className="space-y-1">
              {uploadedFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between p-2 text-sm rounded-md bg-secondary"
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate" title={file.name}>{file.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 flex-shrink-0"
                    onClick={() => removeFile(file.name)}
                    aria-label={`Remove ${file.name}`}
                  >
                    <XCircle className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
