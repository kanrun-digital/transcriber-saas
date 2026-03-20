"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface DocumentUploadProps {
  workspaceId: number;
  projectId?: number;
  onSuccess?: (doc: { documentId: number; filename: string; contentLength: number }) => void;
}

const ACCEPTED_EXTENSIONS = ".txt,.md,.pdf";
const MAX_SIZE_MB = 10;

export function DocumentUpload({ workspaceId, projectId, onSuccess }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", String(workspaceId));
      if (projectId) {
        formData.append("projectId", String(projectId));
      }

      const res = await fetch("/api/rag/upload-document", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(data.error || "Upload failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Документ "${data.filename}" завантажено (${data.contentLength.toLocaleString()} символів)`);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Помилка завантаження");
    },
  });

  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!["txt", "md", "pdf"].includes(ext)) {
      toast.error("Підтримуються тільки .txt, .md, .pdf файли");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Файл занадто великий. Максимум ${MAX_SIZE_MB} MB`);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : selectedFile
              ? "border-green-500/50 bg-green-500/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-green-500" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">
                Перетягніть файл або натисніть для вибору
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                .txt, .md, .pdf — до {MAX_SIZE_MB} MB
              </p>
            </>
          )}
        </div>

        {/* Upload button */}
        {selectedFile && (
          <Button
            className="w-full mt-4"
            onClick={handleUpload}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Завантаження...</>
            ) : uploadMutation.isSuccess ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Завантажено</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Завантажити документ</>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
