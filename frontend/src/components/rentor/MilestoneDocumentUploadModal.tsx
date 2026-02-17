"use client";

import { useState, useRef } from "react";
import { Button, Badge } from "@/components/ui";
import { MilestoneDocument } from "@/types";
import { vehicleApi } from "@/lib/api";
import { toast } from "react-hot-toast";

const MILESTONE_NAMES = [
  "Vehicle Identified",
  "Purchase Verified",
  "Insurance Obtained",
  "Registration Completed",
];

const MILESTONE_DESCRIPTIONS: Record<string, string> = {
  "Vehicle Identified": "Upload proof of vehicle identification (photos, listing, etc.)",
  "Purchase Verified": "Upload purchase receipt, bill of sale, or transfer document",
  "Insurance Obtained": "Upload insurance certificate or policy document",
  "Registration Completed": "Upload vehicle registration papers",
};

interface MilestoneDocumentUploadModalProps {
  vehicleId: string;
  existingDocuments?: MilestoneDocument[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function MilestoneDocumentUploadModal({
  vehicleId,
  existingDocuments = [],
  onClose,
  onSuccess,
}: MilestoneDocumentUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getExistingDoc = (milestoneName: string) =>
    existingDocuments.find((doc) => doc.milestoneName === milestoneName);

  const handleFileSelect = (milestoneName: string, file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, and PDF files are allowed");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setSelectedFiles((prev) => ({ ...prev, [milestoneName]: file }));
  };

  const handleUpload = async () => {
    const fileEntries = Object.entries(selectedFiles);
    if (fileEntries.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      for (const [milestoneName, file] of fileEntries) {
        formData.append(milestoneName, file);
      }

      const result = await vehicleApi.uploadMilestoneDocuments(vehicleId, formData);
      if (result.success) {
        toast.success(`${fileEntries.length} document${fileEntries.length > 1 ? "s" : ""} uploaded`);
        setSelectedFiles({});
        onSuccess?.();
        onClose();
      } else {
        toast.error("Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload Milestone Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload proof documents for each milestone. Accepted: JPEG, PNG, PDF (max 10MB).
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Milestone rows */}
        <div className="p-6 space-y-4">
          {MILESTONE_NAMES.map((name) => {
            const existingDoc = getExistingDoc(name);
            const selectedFile = selectedFiles[name];

            return (
              <div key={name} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-500">{MILESTONE_DESCRIPTIONS[name]}</p>
                  </div>
                  {existingDoc && !selectedFile && (
                    <Badge variant="success">Uploaded</Badge>
                  )}
                  {selectedFile && (
                    <Badge variant="warning">New file selected</Badge>
                  )}
                </div>

                {/* Existing document info */}
                {existingDoc && !selectedFile && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 bg-green-50 rounded p-2">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="truncate">{existingDoc.originalName}</span>
                    {existingDoc.size && (
                      <span className="text-gray-400">({formatFileSize(existingDoc.size)})</span>
                    )}
                    <span className="text-gray-400 ml-auto shrink-0">
                      {new Date(existingDoc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Selected file info */}
                {selectedFile && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 bg-amber-50 rounded p-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="truncate">{selectedFile.name}</span>
                    <span className="text-gray-400">({formatFileSize(selectedFile.size)})</span>
                    <button
                      onClick={() => {
                        setSelectedFiles((prev) => {
                          const next = { ...prev };
                          delete next[name];
                          return next;
                        });
                      }}
                      className="text-red-400 hover:text-red-600 ml-auto shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {/* File input */}
                <div className="mt-2">
                  <input
                    ref={(el) => { fileInputRefs.current[name] = el; }}
                    type="file"
                    accept=".jpeg,.jpg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileSelect(name, e.target.files?.[0] || null)}
                  />
                  <button
                    onClick={() => fileInputRefs.current[name]?.click()}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {existingDoc || selectedFile ? "Replace file" : "Choose file"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 rounded-b-xl">
          <p className="text-xs text-gray-500">
            {Object.keys(selectedFiles).length} new file{Object.keys(selectedFiles).length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isUploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isUploading || Object.keys(selectedFiles).length === 0}
            >
              {isUploading ? "Uploading..." : "Upload Documents"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
