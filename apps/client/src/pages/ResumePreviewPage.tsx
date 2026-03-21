import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResume, type Resume } from "../lib/resume-api";
import { exportToPdf, exportToDocx } from "../lib/resume-export";
import ResumePreview from "../components/ResumePreview";

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const fetchResume = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data, status } = await getResume(id);
    if (status === 404 || !data) {
      navigate("/resumes");
      return;
    }
    setResume(data);
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => {
    fetchResume();
  }, [fetchResume]);

  const safeFilename = (resume?.title || "resume")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  async function handlePdf() {
    if (!previewRef.current) return;
    setExporting("pdf");
    try {
      await exportToPdf(previewRef.current, safeFilename);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
    setExporting(null);
  }

  async function handleDocx() {
    if (!resume) return;
    setExporting("docx");
    try {
      await exportToDocx(resume.sections, safeFilename);
    } catch (err) {
      console.error("DOCX export failed:", err);
    }
    setExporting(null);
  }

  if (loading || !resume) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-lg font-bold text-(--color-text) tracking-tight">
          Preview
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePdf}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === "pdf" ? (
              <div className="w-3.5 h-3.5 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            PDF
          </button>
          <button
            onClick={handleDocx}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-(--color-border) bg-(--color-surface-raised) text-[13px] font-semibold text-(--color-text-secondary) hover:text-(--color-text) hover:border-(--color-text-tertiary) shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === "docx" ? (
              <div className="w-3.5 h-3.5 border-2 border-(--color-accent) border-t-transparent rounded-full animate-spin-slow" />
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            )}
            DOCX
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="max-w-3xl mx-auto" ref={previewRef}>
        <ResumePreview
          sections={resume.sections}
          title={resume.title}
          targetRole={resume.target_role}
        />
      </div>
    </div>
  );
}
