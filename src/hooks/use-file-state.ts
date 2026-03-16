"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useFileState() {
  const [file, setFileInternal] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  const setFile = useCallback((nextFile: File | null) => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setFileInternal(nextFile);

    if (nextFile) {
      const url = URL.createObjectURL(nextFile);
      previewRef.current = url;
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
  }, [setFile]);

  return { file, previewUrl, setFile, clearFile };
}
