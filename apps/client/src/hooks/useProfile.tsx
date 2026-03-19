import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { getMe, getProfile, type UserProfile } from "../lib/api";

export const emptyProfile: UserProfile = {
  full_name: "",
  avatar_url: "",
  headline: "",
  summary: "",
  location: "",
  phone: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  skills: [],
  experience: [],
  education: [],
  certifications: [],
};

// Completeness fields and their weights
const completenessFields: { key: keyof UserProfile; required?: boolean }[] = [
  { key: "full_name", required: true },
  { key: "headline" },
  { key: "summary" },
  { key: "location" },
  { key: "phone" },
  { key: "linkedin_url" },
  { key: "avatar_url" },
  { key: "skills" },
];

export function calcCompleteness(p: UserProfile): number {
  let filled = 0;
  for (const f of completenessFields) {
    const val = p[f.key];
    if (Array.isArray(val) ? val.length > 0 : typeof val === "string" && val.trim() !== "") {
      filled++;
    }
  }
  return Math.round((filled / completenessFields.length) * 100);
}

interface ProfileCtx {
  profile: UserProfile;
  email: string;
  role: string;
  loading: boolean;
  exists: boolean;
  completeness: number;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ProfileCtx>({
  profile: emptyProfile,
  email: "",
  role: "member",
  loading: true,
  exists: false,
  completeness: 0,
  refresh: async () => {},
});

export function ProfileProvider({ children }: { children: ReactNode }) {
  const session = useSessionContext();
  const userId = !session.loading && session.doesSessionExist ? session.userId : "";

  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Fetch user info and profile in parallel
    const [meRes, profileRes] = await Promise.all([
      getMe(),
      getProfile(userId),
    ]);

    if (meRes.data) {
      setEmail(meRes.data.email);
      setRole(meRes.data.role || "member");
    }

    if (profileRes.status === 404 || !profileRes.data) {
      setExists(false);
      setProfile(emptyProfile);
    } else {
      setExists(true);
      setProfile(profileRes.data);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const completeness = calcCompleteness(profile);

  return (
    <Ctx.Provider value={{ profile, email, role, loading, exists, completeness, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile() {
  return useContext(Ctx);
}
