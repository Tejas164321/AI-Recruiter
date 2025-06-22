
"use client";

import { UploadCloud, FileText, XCircle } from "lucide-react";
import React, { useCallback, useState } from "react";
// react-dropzone library for drag-and-drop functionality
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
// Utilities and Hooks
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

/**
 * Props for the FileUploadArea component.
 */
interface FileUploadAreaProps {
  onFilesUpload: (files: File[]) => void;
  acceptedFileTypes: Accept;
  multiple?: boolean;
  label: string;
  id: string;
  maxSizeInBytes?: number;
  showFileList?: boolean;
  dropzoneClassName?: string;
}

/**
 * A reusable component for file uploading via drag-and-drop or file selection.
 * @param {FileUploadAreaProps} props - The component props.
 */
export function FileUploadArea({
  onFilesUpload,
  acceptedFileTypes,
  multiple = false,
  label,
  id,
  maxSizeInBytes,
  showFileList = true,
  dropzoneClassName,
}: FileUploadAreaProps) {
  // Internal state to manage the list of displayed files.
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  /**
   * Callback function executed when files are dropped or selected.
   * Handles both accepted and rejected files.
   */
  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      // Handle rejected files by showing a toast notification for each error.
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          let description = `Could not upload "${file.name}": ${error.message}`;
          if (error.code === "file-too-large") {
            description = `File "${file.name}" is too large. Max size is ${maxSizeInBytes ? (maxSizeInBytes / (1024 * 1024)).toFixed(0) : 'N/A'}MB.`;
          }
          toast({ title: "File Rejected", description, variant: "destructive" });
        });
      });

      // Process accepted files.
      if (acceptedFiles.length > 0) {
        // If multiple files are allowed, append them; otherwise, replace.
        const newFiles = multiple ? [...uploadedFiles, ...acceptedFiles] : acceptedFiles;
        // Ensure the list is unique by filename to avoid duplicates.
        const uniqueNewFiles = newFiles.filter(
          (file, index, self) => index === self.findIndex((f) => f.name === file.name)
        );

        // Call the parent callback with the updated list of files.
        onFilesUpload(uniqueNewFiles);

        // Update the internal state for display only if the file list is visible.
        if (showFileList) {
          setUploadedFiles(uniqueNewFiles);
        } else {
          setUploadedFiles([]); // Clear internal state if list is hidden.
        }
      }
    },
    [onFilesUpload, multiple, uploadedFiles, toast, maxSizeInBytes, showFileList]
  );

  // Initialize react-dropzone with the configuration.
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple,
    maxSize: maxSizeInBytes,
  });

  /**
   * Removes a file from the uploaded list.
   * @param {string} fileName - The name of the file to remove.
   */
  const removeFile = (fileName: string) => {
    const newFiles = uploadedFiles.filter((file) => file.name !== fileName);
    setUploadedFiles(newFiles);
    // Inform the parent component that the file list has changed.
    onFilesUpload(newFiles);
  };

  return (
    <div className="space-y-4">
      {/* The main dropzone area */}
      <div
        {...getRootProps()}
        className={cn(
          "flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/70 transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-border",
          "bg-card",
          dropzoneClassName
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
      {/* The list of uploaded files (conditionally rendered) */}
      {showFileList && uploadedFiles.length > 0 && (
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
