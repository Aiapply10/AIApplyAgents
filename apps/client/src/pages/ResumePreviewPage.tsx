import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getResume, type Resume } from "../lib/resume-api";
import ResumePreview from "../components/ResumePreview";

export default function ResumePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center mb-8">
        <h1 className="font-display text-lg font-bold text-(--color-text) tracking-tight">
          Preview
        </h1>
      </div>

      {/* Preview */}
      <div className="max-w-3xl mx-auto">
        <ResumePreview
          sections={resume.sections}
          title={resume.title}
          targetRole={resume.target_role}
        />
      </div>
    </div>
  );
}
