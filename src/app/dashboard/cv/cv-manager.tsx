"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/feedback";
import { removeCvAction, uploadCvAction, type CvFormState } from "@/lib/cv/actions";

const initialState: CvFormState = {};

interface CvInfo {
  fileName: string;
  status: string;
  uploadedAt: string;
}

export function CvManager({ cv }: { cv: CvInfo | null }) {
  const [uploadState, uploadAction, uploadPending] = useActionState(uploadCvAction, initialState);
  const [removeState, removeAction, removePending] = useActionState(removeCvAction, initialState);

  return (
    <div className="space-y-4">
      {uploadState.error && <Alert variant="danger">{uploadState.error}</Alert>}
      {uploadState.success && <Alert variant="success">CV uploaded.</Alert>}
      {removeState.error && <Alert variant="danger">{removeState.error}</Alert>}

      {cv ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
          <div>
            <p className="font-medium">{cv.fileName}</p>
            <p className="text-sm text-muted">
              Uploaded {new Date(cv.uploadedAt).toLocaleDateString()} <Badge className="ml-2">{cv.status}</Badge>
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/api/cv/download">
              <Button type="button" variant="secondary">
                Download
              </Button>
            </a>
            <form action={removeAction}>
              <Button type="submit" variant="danger" disabled={removePending}>
                {removePending ? "Removing..." : "Remove"}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No CV uploaded yet. Uploading one can improve your matches.</p>
      )}

      <form action={uploadAction} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="text-sm"
        />
        <Button type="submit" disabled={uploadPending}>
          {uploadPending ? "Uploading..." : cv ? "Replace CV" : "Upload CV"}
        </Button>
      </form>
      <p className="text-xs text-muted">PDF or Word documents, up to 10 MB.</p>
    </div>
  );
}
