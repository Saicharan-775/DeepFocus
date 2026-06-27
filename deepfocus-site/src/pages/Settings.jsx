import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getSafeUser, getSafeSession } from "../utils/authHelpers";
import {
  User,
  BrainCircuit,
  Blocks,
  Check,
  ChevronDown,
  Save,
  Link2,
  ShieldCheck,
  Copy,
  Shuffle,
  Sparkles,
  Megaphone,
  Globe,
  Trophy,
  BookOpen,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Calendar,
  Eye,
  MousePointerClick,
  Shield,
  ToggleLeft,
  ToggleRight,
  List,
  Mail,
  Send,
  Activity,
  Download,
} from "lucide-react";
import { useToast } from "../hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import { Icon } from "@iconify/react";
import { SettingsSkeleton } from "../components/Boneyard";


const tabs = [
  {
    id: "account",
    label: "Account",
    icon: User,
  },
  {
    id: "engine",
    label: "AI Engine",
    icon: BrainCircuit,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Blocks,
  },
];

const AI_PROVIDERS = [
  { id: "openrouter", name: "OpenRouter", desc: "Low-cost routing" },
  { id: "groq", name: "Groq", desc: "Fast inference" },
  { id: "openai", name: "OpenAI", desc: "GPT models" },
];

const CURATED_AVATARS = [
  { id: "avataaars-1", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&backgroundColor=c0aede,d1d4f9" },
  { id: "avataaars-2", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia&backgroundColor=b6e3f4,c0aede" },
  { id: "avataaars-3", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe&backgroundColor=ffdfdf,f0d5da" },
  { id: "avataaars-4", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=c084fc,818cf8" },
  { id: "adventurer-1", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=b6e3f4,d1d4f9" },
  { id: "adventurer-2", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Maya&backgroundColor=ffd8be,fecdd3" },
  { id: "adventurer-3", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Jude&backgroundColor=d2f4ea,bbf7d0" },
  { id: "adventurer-4", url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Gavin&backgroundColor=ffdfdf,c0aede" },
  { id: "fun-emoji-1", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Focus&backgroundColor=b6e3f4,c0aede" },
  { id: "fun-emoji-2", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Deep&backgroundColor=c0aede,d1d4f9" },
  { id: "fun-emoji-3", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Mind&backgroundColor=ffdfdf,f0d5da" },
  { id: "fun-emoji-4", url: "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Limit&backgroundColor=c084fc,818cf8" },
  { id: "bottts-1", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Tech&backgroundColor=c084fc,818cf8" },
  { id: "bottts-2", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Buster&backgroundColor=ec4899,8b5cf6" },
  { id: "bottts-3", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Spark&backgroundColor=b6e3f4,c0aede" },
  { id: "bottts-4", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Cy&backgroundColor=d2f4ea,bbf7d0" },
];

function getInitialAiProvider() {
  const saved = localStorage.getItem("df_ai_provider");
  return AI_PROVIDERS.some((provider) => provider.id === saved) ? saved : "openrouter";
}

const notifIcons = {
  system: <Globe size={14} className="text-blue-400" />,
  feature: <Sparkles size={14} className="text-emerald-400" />,
  achievement: <Trophy size={14} className="text-amber-400" />,
  revision: <BookOpen size={14} className="text-violet-400" />,
  warning: <AlertTriangle size={14} className="text-rose-400" />,
  announcement: <Megaphone size={14} className="text-cyan-400" />,
};

const notifBgColors = {
  system: 'bg-blue-500/10 border-blue-500/20',
  feature: 'bg-emerald-500/10 border-emerald-500/20',
  achievement: 'bg-amber-500/10 border-amber-500/20',
  revision: 'bg-violet-500/10 border-violet-500/20',
  warning: 'bg-rose-500/10 border-rose-500/20',
  announcement: 'bg-cyan-500/10 border-cyan-500/20',
};

export default function Settings() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("account");
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(5);

  const [openAiKey, setOpenAiKey] = useState(localStorage.getItem("df_openai_key") || "");
  const [openrouterApiKey, setOpenrouterApiKey] = useState(localStorage.getItem("df_openrouter_api_key") || "");
  const [groqApiKey, setGroqApiKey] = useState(localStorage.getItem("df_groq_api_key") || "");
  const [aiProvider, setAiProvider] = useState(() => getInitialAiProvider());

  const [stats, setStats] = useState({
    focusScore: 0,
    sessions: 0,
    dayStreak: 0,
    problems: 0,
    aiUsageCount: parseInt(localStorage.getItem('df_ai_usage_count') || '0', 10),
    loading: true,
  });

  const [extensionLinked, setExtensionLinked] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showPairToken, setShowPairToken] = useState(false);

  const [saveState, setSaveState] = useState("saved");
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [fullName, setFullName] = useState("");

  // Custom Avatar Builder States
  const [customStyle, setCustomStyle] = useState("avataaars");
  const [customSeed, setCustomSeed] = useState("Focus");
  const [customBgType, setCustomBgType] = useState("gradientLinear");
  const [customBgColor, setCustomBgColor] = useState("c0aede,d1d4f9");

  // ==============================================================
  // Broadcast Center State Variables
  // ==============================================================
  const [featureFlags, setFeatureFlags] = useState({
    notifications: true,
    realtime_notifications: true,
    email_broadcasts: true,
    broadcast_center: true,
  });

  const [composer, setComposer] = useState({
    title: "",
    message: "",
    type: "announcement",
    target_segment: "all",
    delivery_method: "in_app",
    scheduled_for: "",
    expires_at: "",
    icon: "Megaphone",
    image_url: "",
    cta_text: "",
    cta_url: "",
  });

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [deliveryFailures, setDeliveryFailures] = useState([]);
  const [failuresLoading, setFailuresLoading] = useState(false);
  
  const [activeAnalytics, setActiveAnalytics] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState({});
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Broadcast Safety System States
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [estimatingLoading, setEstimatingLoading] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  // Check connection state of extension
  const checkExtensionConnection = async (userId) => {
    const { data: conn } = await supabase
      .from("extension_connections")
      .select("created_at")
      .eq("user_id", userId)
      .maybeSingle();

    setExtensionLinked(!!conn);
  };

  // Fetch campaign analytics log
  const fetchCampaignAnalytics = async (campaignId) => {
    setAnalyticsLoading((prev) => ({ ...prev, [campaignId]: true }));
    try {
      const { data, error } = await supabase.rpc("get_notification_analytics", {
        p_notification_id: campaignId,
      });
      if (error) throw error;
      if (data && data[0]) {
        setActiveAnalytics((prev) => ({ ...prev, [campaignId]: data[0] }));
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      showToast("Error", "Could not fetch campaign statistics.", "warning");
    } finally {
      setAnalyticsLoading((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  // Toggle expanded analytics log view
  const toggleCampaignAnalytics = (campaignId) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(campaignId);
      if (!activeAnalytics[campaignId]) {
        fetchCampaignAnalytics(campaignId);
      }
    }
  };

  // Fetch campaign logs history
  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .is("user_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  // Fetch admin audit logs trail
  const fetchAuditLogs = useCallback(async () => {
    setAuditLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setAuditLogsLoading(false);
    }
  }, []);

  // Fetch delivery failures log
  const fetchDeliveryFailures = useCallback(async () => {
    setFailuresLoading(true);
    try {
      const { data, error } = await supabase
        .from("broadcast_deliveries")
        .select("created_at, email, error_message, notification_id")
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setDeliveryFailures(data || []);
    } catch (err) {
      console.error("Error fetching delivery failures:", err);
    } finally {
      setFailuresLoading(false);
    }
  }, []);

  // Fetch feature flags state
  const fetchFeatureFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("feature_flags").select("*");
      if (error) throw error;
      if (data) {
        const flagMap = {};
        data.forEach((f) => {
          flagMap[f.key] = f.value;
        });
        setFeatureFlags(flagMap);
      }
    } catch (err) {
      console.error("Error fetching feature flags:", err);
    }
  }, []);

  // Fetch estimated recipients dynamically on segment change
  const fetchRecipientCount = useCallback(async (segment) => {
    setEstimatingLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_segment_recipient_count", {
        p_segment: segment,
      });
      if (error) throw error;
      setEstimatedRecipients(data || 0);
    } catch (err) {
      console.error("Failed to estimate recipients:", err);
      setEstimatedRecipients(0);
    } finally {
      setEstimatingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (composer.target_segment && isAdmin) {
      fetchRecipientCount(composer.target_segment);
    }
  }, [composer.target_segment, isAdmin, fetchRecipientCount]);

  // Toggle settings feature flag
  const handleToggleFlag = async (key, currentValue) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ value: !currentValue, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;
      
      setFeatureFlags((prev) => ({ ...prev, [key]: !currentValue }));
      showToast("Settings Updated", `Feature flag '${key}' updated successfully.`, "system");
      fetchAuditLogs();
    } catch (err) {
      console.error("Failed to update feature flag:", err);
      showToast("Error", "Failed to update feature flag.", "warning");
    }
  };

  // Trigger Send Test Broadcast
  const handleSendTestBroadcast = async () => {
    if (!composer.title.trim() || !composer.message.trim()) {
      showToast("Validation Error", "Title and Message are required to send a test.", "warning");
      return;
    }

    setIsTesting(true);
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing active session JWT token.");

      // Save as draft/unpublished first
      const testPayload = {
        title: `[TEST] ${composer.title.trim()}`,
        message: composer.message.trim(),
        type: composer.type,
        target_segment: "all",
        delivery_method: "email",
        scheduled_for: new Date().toISOString(),
        is_published: false,
        icon: composer.icon,
        image_url: composer.image_url.trim() || null,
        cta_text: composer.cta_text.trim() || null,
        cta_url: composer.cta_url.trim() || null,
      };

      const { data: testNotif, error: testErr } = await supabase
        .from("notifications")
        .insert(testPayload)
        .select()
        .single();

      if (testErr) throw testErr;

      // Trigger test send API
      const response = await fetch("/api/send-broadcast", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId: testNotif.id,
          isTestSend: true,
          testEmail: testEmailAddress.trim() || user.email
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Test dispatch failed.");

      showToast("Test Sent", `Successfully dispatched test campaign to ${testEmailAddress.trim() || user.email}`, "feature");
      
      // Clean up draft notification
      await supabase.from("notifications").delete().eq("id", testNotif.id);
    } catch (err) {
      console.error("Test send failed:", err);
      showToast("Failed", err.message || "Test dispatch failed.", "warning");
    } finally {
      setIsTesting(false);
    }
  };

  // Open confirmation modal
  const triggerDeployConfirmation = (e) => {
    e.preventDefault();
    if (!composer.title.trim() || !composer.message.trim()) {
      showToast("Validation Error", "Title and Message details are required.", "warning");
      return;
    }
    setConfirmInput("");
    setIsConfirmOpen(true);
  };

  // Deploy broadcast notification campaign (confirmed)
  const handleConfirmDeploy = async () => {
    if (confirmInput !== "DEPLOY") {
      showToast("Validation Error", "Please type DEPLOY to confirm.", "warning");
      return;
    }
    
    setIsConfirmOpen(false);
    setIsDeploying(true);
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing active session JWT token.");

      const isEmailCampaign = composer.delivery_method === "email" || composer.delivery_method === "both";
      if (isEmailCampaign && !featureFlags.email_broadcasts) {
        showToast("Blocked", "Email broadcasts are disabled by feature flags.", "warning");
        setIsDeploying(false);
        return;
      }

      // 1. Insert campaign row into notifications table
      const scheduledTime = composer.scheduled_for ? new Date(composer.scheduled_for).toISOString() : new Date().toISOString();
      const expiryTime = composer.expires_at ? new Date(composer.expires_at).toISOString() : null;
      const isFutureScheduled = composer.scheduled_for && new Date(composer.scheduled_for) > new Date();

      const notifPayload = {
        title: composer.title.trim(),
        message: composer.message.trim(),
        type: composer.type,
        target_segment: composer.target_segment,
        delivery_method: composer.delivery_method,
        scheduled_for: scheduledTime,
        expires_at: expiryTime,
        is_published: !isFutureScheduled,
        icon: composer.icon,
        image_url: composer.image_url.trim() || null,
        cta_text: composer.cta_text.trim() || null,
        cta_url: composer.cta_url.trim() || null,
      };

      const { data: newNotif, error: notifError } = await supabase
        .from("notifications")
        .insert(notifPayload)
        .select()
        .single();

      if (notifError) throw notifError;

      // 2. Dispatch real-time sockets broadcast push in-memory immediately if not scheduled for future
      if (!isFutureScheduled && featureFlags.realtime_notifications) {
        const targetChannel = supabase.channel(`announcements:${composer.target_segment}`);
        await targetChannel.send({
          type: "broadcast",
          event: "new_announcement",
          payload: {
            title: composer.title,
            message: composer.message,
            type: composer.type,
            id: newNotif.id,
            cta_text: composer.cta_text,
            cta_url: composer.cta_url,
            image_url: composer.image_url,
          },
        });
        supabase.removeChannel(targetChannel);
      }

      // 3. Dispatch email requests to serverless endpoint if requested
      if (isEmailCampaign) {
        const response = await fetch("/api/send-broadcast", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationId: newNotif.id }),
        });

        const dispatchResult = await response.json();
        if (!response.ok) {
          throw new Error(dispatchResult.error || "Email campaign dispatch failed.");
        }
      }

      showToast("Success", "Broadcast campaign deployed successfully.", "feature");
      
      // Clear composer form fields
      setComposer({
        title: "",
        message: "",
        type: "announcement",
        target_segment: "all",
        delivery_method: "in_app",
        scheduled_for: "",
        expires_at: "",
        icon: "Megaphone",
        image_url: "",
        cta_text: "",
        cta_url: "",
      });

      fetchCampaigns();
      fetchAuditLogs();
      fetchDeliveryFailures();
    } catch (err) {
      console.error("Failed to deploy broadcast campaign:", err);
      showToast("Failed", err.message || "An error occurred during campaign deployment.", "warning");
    } finally {
      setIsDeploying(false);
    }
  };

  // Delete / Retract campaign log
  const handleDeleteCampaign = async (campaignId) => {
    if (!window.confirm("Are you sure you want to retract and delete this campaign? All analytics logs will be lost.")) {
      return;
    }

    try {
      const { error } = await supabase.from("notifications").delete().eq("id", campaignId);
      if (error) throw error;
      showToast("Campaign Retracted", "Broadcast was successfully removed from history.", "system");
      fetchCampaigns();
      fetchAuditLogs();
      fetchDeliveryFailures();
    } catch (err) {
      console.error("Retract failed:", err);
      showToast("Error", "Failed to retract broadcast campaign.", "warning");
    }
  };

  // Load initial settings data and metrics
  useEffect(() => {
    let channel;

    const handleConnectionChange = (e) => {
      if (e.detail && e.detail.connected !== undefined) {
        setExtensionLinked(e.detail.connected);
      }
    };
    window.addEventListener("deepfocus_connection_changed", handleConnectionChange);

    const initSettings = async () => {
      try {
        const user = await getSafeUser();
        setUser(user);
        if (user) {
          setSelectedAvatarUrl(user.user_metadata?.avatar_url || "");
          setFullName(user.user_metadata?.full_name || "");
          setTestEmailAddress(user.email || "");
          checkExtensionConnection(user.id);

          // Fetch User RBAC Role
          const { data: profileData } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

          if (profileData && profileData.role === "admin") {
            setIsAdmin(true);
            fetchCampaigns();
            fetchAuditLogs();
            fetchFeatureFlags();
            fetchDeliveryFailures();
          }

          const loadStats = async () => {
            try {
              const [pRes, sRes] = await Promise.all([
                supabase.from("revision_problems").select("*").eq("user_id", user.id),
                supabase.from("focus_sessions").select("*").eq("user_id", user.id),
              ]);

              const problems = pRes.data || [];
              const sessions = sRes.data || [];

              const problemScores = problems.filter((p) => p.focus_score !== undefined && p.focus_score !== null);
              let avgFocusScore = 0;
              if (problemScores.length > 0) {
                avgFocusScore = Math.round(problemScores.reduce((acc, p) => acc + p.focus_score, 0) / problemScores.length);
              } else if (sessions.length > 0) {
                avgFocusScore = Math.round(sessions.reduce((acc, s) => acc + (s.focus_score || 0), 0) / sessions.length);
              }

              const activityMap = {};
              problems.forEach((p) => {
                const dateKey = dayjs(p.created_at).format("YYYY-MM-DD");
                activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
              });
              sessions.forEach((s) => {
                const dateKey = dayjs(s.start_time || s.created_at).format("YYYY-MM-DD");
                activityMap[dateKey] = (activityMap[dateKey] || 0) + 1;
              });

              let currentStreak = 0;
              const today = dayjs().format("YYYY-MM-DD");
              const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");

              if (activityMap[today] || activityMap[yesterday]) {
                let checkDate = activityMap[today] ? dayjs(today) : dayjs(yesterday);
                while (activityMap[checkDate.format("YYYY-MM-DD")]) {
                  currentStreak++;
                  checkDate = checkDate.subtract(1, "day");
                }
              }

              setStats({
                focusScore: avgFocusScore,
                sessions: sessions.length,
                dayStreak: currentStreak,
                problems: problems.length,
                aiUsageCount: parseInt(localStorage.getItem('df_ai_usage_count') || '0', 10),
                loading: false,
              });
            } catch (err) {
              console.error("[Settings Stats Load Error]:", err);
              setStats((prev) => ({ ...prev, loading: false }));
            }
          };

          loadStats();

          const handleSync = async () => {
            try {
              await loadStats();
            } catch (err) {
              console.error("[Settings Stats Sync Error]:", err);
            }
          };

          channel = supabase
            .channel("settings_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "revision_problems" }, handleSync)
            .on("postgres_changes", { event: "*", schema: "public", table: "focus_sessions" }, handleSync)
            .subscribe();
        } else {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("[Settings Init Error]:", err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    initSettings();

    setDailyGoal(parseInt(localStorage.getItem("dailyRevisionGoal")) || 5);

    const handleAiUsageUpdate = () => {
      setStats((prev) => ({
        ...prev,
        aiUsageCount: parseInt(localStorage.getItem('df_ai_usage_count') || '0', 10)
      }));
    };
    
    window.addEventListener("df_ai_usage_updated", handleAiUsageUpdate);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener("deepfocus_connection_changed", handleConnectionChange);
      window.removeEventListener("df_ai_usage_updated", handleAiUsageUpdate);
    };
  }, [fetchCampaigns, fetchAuditLogs, fetchFeatureFlags, fetchDeliveryFailures]);

  useEffect(() => {
    setSaveState("unsaved");
  }, [dailyGoal, openAiKey, openrouterApiKey, groqApiKey, aiProvider, selectedAvatarUrl, fullName]);

  const saveSettings = async () => {
    localStorage.setItem("dailyRevisionGoal", dailyGoal);
    localStorage.setItem("df_openai_key", openAiKey.trim());
    localStorage.setItem("df_openrouter_api_key", openrouterApiKey.trim());
    localStorage.setItem("df_groq_api_key", groqApiKey.trim());
    localStorage.setItem("df_ai_provider", aiProvider);

    const selectedOpenrouterKey = openrouterApiKey.trim();
    const selectedGroqKey = groqApiKey.trim();
    const selectedOpenAiKey = openAiKey.trim();
    const hasUserKey = !!(selectedOpenrouterKey || selectedGroqKey || selectedOpenAiKey);
    
    window.postMessage({
      type: "DEEPFOCUS_SET_AI_KEYS",
      openrouterApiKey: hasUserKey ? selectedOpenrouterKey : "",
      groqApiKey: hasUserKey ? selectedGroqKey : "",
      openAiApiKey: hasUserKey ? selectedOpenAiKey : "",
      aiKeyMode: hasUserKey ? "byok" : "none",
    }, window.location.origin);

    const metadataUpdates = {};
    let needsUpdate = false;
    if (selectedAvatarUrl !== (user?.user_metadata?.avatar_url || "")) {
      metadataUpdates.avatar_url = selectedAvatarUrl;
      needsUpdate = true;
    }
    if (fullName.trim() !== (user?.user_metadata?.full_name || "")) {
      metadataUpdates.full_name = fullName.trim();
      needsUpdate = true;
    }

    if (needsUpdate) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          data: metadataUpdates,
        });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Error updating profile details:", err);
      }
    }

    setSaveState("saved");
  };

  const clearAiKeys = () => {
    setOpenrouterApiKey("");
    setGroqApiKey("");
    setOpenAiKey("");
    localStorage.removeItem("df_openrouter_api_key");
    localStorage.removeItem("df_groq_api_key");
    localStorage.removeItem("df_openai_key");
    localStorage.setItem("df_ai_provider", aiProvider);
    window.postMessage({
      type: "DEEPFOCUS_SET_AI_KEYS",
      openrouterApiKey: "",
      groqApiKey: "",
      openAiApiKey: "",
      aiKeyMode: "none",
    }, window.location.origin);
    setSaveState("saved");
  };

  const handleConnectExtension = async () => {
    setIsConnecting(true);
    try {
      const rawToken = "dfx_" + crypto.randomUUID().replace(/-/g, "");
      const encoder = new TextEncoder();
      const data = encoder.encode(rawToken.trim());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map((b) => ("00" + b.toString(16)).slice(-2)).join("");

      const { error: rpcError } = await supabase.rpc("upsert_extension_token", {
        p_token_hash: tokenHash,
      });

      if (rpcError) throw rpcError;

      setGeneratedToken(rawToken);
      setShowPairToken(false);

      window.postMessage({
        type: "DEEPFOCUS_CONNECT",
        token: rawToken,
      }, window.location.origin);

      setTimeout(() => {
        if (user) {
          checkExtensionConnection(user.id);
        }
      }, 2000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      // 1. Fetch revision problems
      const { data: revisionProblems, error: revErr } = await supabase
        .from('revision_problems')
        .select('*');
      if (revErr) throw revErr;
        
      // 2. Fetch focus sessions
      const { data: focusSessions, error: sessErr } = await supabase
        .from('focus_sessions')
        .select('*');
      if (sessErr) throw sessErr;

      // 3. Fetch extension connections
      const { data: connections, error: connErr } = await supabase
        .from('extension_connections')
        .select('*');
      if (connErr) throw connErr;

      const exportObj = {
        exportedAt: new Date().toISOString(),
        schemaVersion: "1.0.0",
        user: {
          id: user.id,
          email: user.email,
          fullName: fullName
        },
        settings: {
          dailyGoal,
          selectedAvatarUrl
        },
        revisionProblems: revisionProblems || [],
        focusSessions: focusSessions || [],
        connections: connections || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `deepfocus_data_export_${user.email.replace(/[@.]/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast("Data exported successfully!", "success");
    } catch (e) {
      console.error("Export data failed:", e);
      showToast("Failed to compile user data export.", "error");
    } finally {
      setExporting(false);
    }
  };


  if (stats.loading) {
    return <SettingsSkeleton />;
  }

  const visibleTabs = isAdmin 
    ? [...tabs, { id: "broadcast", label: "Broadcast Center", icon: Megaphone }] 
    : tabs;

  return (
    <div className="min-h-screen bg-[#090909] text-white antialiased">
      
      {/* CONFIRM BROADCAST MODAL (Broadcast Safety System) */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl p-6 text-left"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
                <AlertTriangle className="text-amber-500" size={18} />
                Confirm Broadcast Deployment
              </h3>
              
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 space-y-3 mb-4 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Audience Segment:</span>
                  <strong className="text-white capitalize">{composer.target_segment}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Recipients:</span>
                  <strong className="text-white">{estimatedRecipients} Users</strong>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Method:</span>
                  <strong className="text-white capitalize">{composer.delivery_method.replace("_", " ")}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Scheduled Launch:</span>
                  <strong className="text-white">
                    {composer.scheduled_for ? dayjs(composer.scheduled_for).format("MMMM D, YYYY [at] h:mm A") : "Immediately"}
                  </strong>
                </div>
              </div>

              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                You are about to deploy this campaign. To confirm, please type <strong className="text-zinc-200">DEPLOY</strong> in the text input below:
              </p>

              <input 
                type="text" 
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DEPLOY to verify..."
                className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 text-xs mb-6"
              />

              <div className="flex gap-3 justify-end text-xs">
                <button 
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-4 py-2 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] text-zinc-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDeploy}
                  disabled={confirmInput !== "DEPLOY"}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-600/20"
                >
                  Send Campaign
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* TOP BAR */}
      <div className="sticky top-0 z-20 border-b border-white/[0.04] backdrop-blur-xl bg-black/30">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500 font-semibold">
              Workspace
            </div>

            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-400">
              <span>Settings</span>
              <span className="text-zinc-700">/</span>
              <span className="text-white">
                {visibleTabs.find((t) => t.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {activeTab !== "broadcast" && (
              <div className="hidden items-center gap-2 md:flex">
                <div className={`h-2 w-2 rounded-full ${saveState === "saved" ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span className="text-sm text-zinc-500">
                  {saveState === "saved" ? "All changes saved" : "Unsaved changes"}
                </span>
              </div>
            )}

            {activeTab !== "broadcast" && (
              <button
                onClick={saveSettings}
                className="flex h-9 items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-black transition-all hover:bg-zinc-200 active:scale-[0.98] cursor-pointer"
              >
                <Save size={15} />
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>

      {/* LAYOUT */}
      <div className="mx-auto flex max-w-[1200px] flex-col lg:flex-row lg:items-start gap-10 px-6 py-12">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-[240px] shrink-0">
          <div className="mb-6 px-1">
            <div className="text-[11px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
              Preferences
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {visibleTabs.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-200 cursor-pointer ${
                    active
                      ? "bg-white/[0.06] text-white"
                      : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
                  }`}
                >
                  <div className="relative z-10 flex items-center gap-3">
                    <TabIcon size={16} className={active ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"} />
                    <span className="text-sm font-medium">
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}

          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            
            {/* ACCOUNT TAB */}
            {activeTab === "account" && (
              <motion.div
                key="account"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Account Settings
                  </h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    Manage your workspace profile, learning goals, and public presence.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Basic Information</h3>
                  </div>
                  
                  <div className="divide-y divide-white/[0.06]">
                    <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-5 w-full">
                        <div className="relative shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.05] border border-white/[0.08] text-xl font-semibold overflow-hidden">
                            {selectedAvatarUrl ? (
                              <img src={selectedAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              <span>{fullName ? fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}</span>
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0c0c0c] bg-emerald-500" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Full Name</label>
                            <div className="flex items-center gap-3">
                              <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your name..."
                                className="w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#151515] px-3 py-1.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                              />
                              <div className="flex items-center gap-1 shrink-0 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-zinc-300">
                                <ShieldCheck size={10} />
                                Verified
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4">Choose Your Avatar</div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                        {CURATED_AVATARS.map((avatar) => {
                          const isSelected = selectedAvatarUrl === avatar.url;
                          return (
                            <button
                              key={avatar.id}
                              type="button"
                              onClick={() => {
                                setSelectedAvatarUrl(avatar.url);
                                setSaveState("unsaved");
                              }}
                              className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all p-0.5 bg-white/[0.03] hover:scale-105 active:scale-95 cursor-pointer ${
                                isSelected ? "border-violet-500 ring-2 ring-violet-500/20" : "border-white/[0.08] hover:border-white/[0.2]"
                              }`}
                            >
                              <img src={avatar.url} alt={`Avatar ${avatar.id}`} className="w-full h-full object-cover rounded-full" />
                              {isSelected && (
                                <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                                  <div className="bg-violet-500 text-white rounded-full p-0.5">
                                    <Check size={10} strokeWidth={3} />
                                  </div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/[0.06]">
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-4 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-violet-400" />
                          Design a Custom Avatar
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-6 bg-white/[0.01] border border-white/[0.04] rounded-xl p-5">
                          <div className="flex flex-col items-center justify-center gap-3 shrink-0">
                            <div className="relative group">
                              <div className="absolute -inset-0.5 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-full blur opacity-30 group-hover:opacity-55 transition duration-500" />
                              <div className="relative h-24 w-24 rounded-full bg-[#151515] border border-white/10 p-1 flex items-center justify-center overflow-hidden">
                                <img
                                  src={`https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`}
                                  alt="Custom avatar preview"
                                  className="w-full h-full object-cover rounded-full"
                                />
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newUrl = `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`;
                                setSelectedAvatarUrl(newUrl);
                                setSaveState("unsaved");
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                                selectedAvatarUrl === `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}`
                                  ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                                  : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.08]"
                              }`}
                            >
                              <Check size={12} />
                              {selectedAvatarUrl === `https://api.dicebear.com/7.x/${customStyle}/svg?seed=${encodeURIComponent(customSeed)}&backgroundType=${customBgType}&backgroundColor=${customBgColor}` ? "Selected" : "Apply Design"}
                            </button>
                          </div>

                          <div className="flex-1 space-y-4">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Style</label>
                              <div className="flex flex-wrap gap-2">
                                  {[
                                    { id: "avataaars", label: "Vector Face" },
                                    { id: "adventurer", label: "Adventurer RPG" },
                                    { id: "fun-emoji", label: "Vibrant Emoji" },
                                    { id: "bottts", label: "Detailed Robot" },
                                    { id: "notionists", label: "Notionist" },
                                    { id: "lorelei", label: "Line Sketch" },
                                  ].map((style) => (
                                  <button
                                    key={style.id}
                                    type="button"
                                    onClick={() => setCustomStyle(style.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                                      customStyle === style.id
                                        ? "bg-white/[0.08] border-white/[0.2] text-white"
                                        : "bg-transparent border-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.1]"
                                    }`}
                                  >
                                    {style.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Seed / Keyphrase</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={customSeed}
                                  onChange={(e) => setCustomSeed(e.target.value)}
                                  placeholder="Type anything to morph..."
                                  className="flex-1 rounded-lg border border-white/[0.08] bg-[#151515] px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const adjectives = ["Cool", "Smart", "Swift", "Focus", "Deep", "Code", "Apex", "Zero", "Nova", "Cosmic", "Byte", "Pixel"];
                                    const nouns = ["Coder", "Developer", "Hacker", "Builder", "Sage", "Ninja", "Guru", "Wizard", "Runner", "Ghost", "Alpha", "Zen"];
                                    const randSeed = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                                                     nouns[Math.floor(Math.random() * nouns.length)] + 
                                                     Math.floor(Math.random() * 100);
                                    setCustomSeed(randSeed);
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-colors flex items-center gap-1.5 text-xs cursor-pointer"
                                  title="Randomize seed"
                                >
                                  <Shuffle size={12} />
                                  Random
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Background Gradient</label>
                              <div className="flex items-center gap-3">
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { label: "Ocean Sky", colors: "b6e3f4,c0aede,d1d4f9" },
                                    { label: "Sunset Coral", colors: "ffdfdf,f0d5da" },
                                    { label: "Cyber Punk", colors: "ec4899,8b5cf6" },
                                    { label: "Lavender Dream", colors: "c084fc,818cf8" },
                                    { label: "Emerald Mint", colors: "d2f4ea,bbf7d0" },
                                    { label: "Sweet Peach", colors: "ffd8be,fecdd3" },
                                    { label: "Cosmic Dark", colors: "1e1b4b,312e81" },
                                    { label: "Deep Sea", colors: "0f172a,0d9488" },
                                  ].map((bg, idx) => {
                                    const isSelected = customBgColor === bg.colors;
                                    const splitColors = bg.colors.split(",");
                                    const gradientCss = splitColors.length === 2 
                                      ? `linear-gradient(135deg, #${splitColors[0]}, #${splitColors[1]})`
                                      : splitColors.length === 3 
                                        ? `linear-gradient(135deg, #${splitColors[0]}, #${splitColors[1]}, #${splitColors[2]})`
                                        : `linear-gradient(135deg, #fff, #000)`;

                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCustomBgColor(bg.colors)}
                                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer relative ${
                                          isSelected ? "border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "border-white/10 hover:border-white/30"
                                        }`}
                                        style={{ background: gradientCss }}
                                        title={bg.label}
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STATS CARD */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    ["Focus Score", stats.loading ? "..." : `${stats.focusScore}%`],
                    ["Sessions", stats.loading ? "..." : stats.sessions.toString()],
                    ["Day Streak", stats.loading ? "..." : stats.dayStreak.toString()],
                    ["Problems", stats.loading ? "..." : stats.problems.toString()],
                    ["AI Insights", stats.loading ? "..." : stats.aiUsageCount.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-5 flex flex-col justify-center items-center text-center">
                      <div className="text-2xl font-semibold text-white">{value}</div>
                      <div className="mt-1 text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>

                {/* DAILY GOAL CARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Learning Goals</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-sm font-medium text-white">Daily Revision Target</div>
                        <div className="text-sm text-zinc-500 mt-0.5">Set the number of problems to review per day</div>
                      </div>
                      <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-white/[0.1] bg-[#151515] text-lg font-semibold text-white">
                        {dailyGoal}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="15"
                      value={dailyGoal}
                      onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-white"
                    />

                    <div className="mt-3 flex justify-between text-xs font-medium text-zinc-500">
                      <span>Light (1)</span>
                      <span>Balanced (7)</span>
                      <span>Intense (15)</span>
                    </div>
                  </div>
                </div>

                {/* DATA & PRIVACY CARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Data & Privacy</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      In compliance with GDPR and Chrome Web Store requirements, you can request a complete data export of all your notes, sessions, and connections at any time.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={exporting}
                      className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-zinc-300 font-bold transition-all text-xs cursor-pointer flex items-center gap-2"
                    >
                      {exporting ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-zinc-300" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Exporting Data...</span>
                        </>
                      ) : (
                        <>
                          <Download size={13} />
                          <span>Request Data Export (JSON)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </motion.div>
            )}

            {/* AI ENGINE TAB */}
            {activeTab === "engine" && (
              <motion.div
                key="engine"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">AI Engine</h1>
                  <p className="mt-1 text-sm text-zinc-400">
                    Bring your own provider key. Keys stay on this device and are sent directly to the selected AI provider.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Inference Provider</h3>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {AI_PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setAiProvider(provider.id)}
                          className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer ${
                            aiProvider === provider.id
                              ? "border-white/[0.2] bg-white/[0.04]"
                              : "border-white/[0.04] bg-transparent hover:border-white/[0.1] hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className={`text-sm font-medium ${aiProvider === provider.id ? "text-white" : "text-zinc-300"}`}>
                              {provider.name}
                            </span>
                            <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${aiProvider === provider.id ? "border-white" : "border-zinc-700"}`}>
                              {aiProvider === provider.id && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500">{provider.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Provider Configuration</h3>
                  </div>
                  
                  <div className="divide-y divide-white/[0.06]">
                    {aiProvider === "openrouter" && (
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-1.5">OpenRouter API Key</label>
                          <input
                            type="password"
                            value={openrouterApiKey}
                            onChange={(e) => setOpenrouterApiKey(e.target.value)}
                            placeholder="sk-or-v1-..."
                            className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                          />
                          <p className="mt-2 text-xs text-zinc-500 font-semibold">Used on this device for DeepFocus and the browser extension.</p>
                        </div>
                      </div>
                    )}

                    {aiProvider === "groq" && (
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-1.5">Groq API Key</label>
                          <input
                            type="password"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            placeholder="gsk_..."
                            className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                          />
                          <p className="mt-2 text-xs text-zinc-500 font-semibold">Used on this device for DeepFocus and the browser extension.</p>
                        </div>
                      </div>
                    )}

                    {aiProvider === "openai" && (
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-1.5">OpenAI API Key</label>
                          <input
                            type="password"
                            value={openAiKey}
                            onChange={(e) => setOpenAiKey(e.target.value)}
                            placeholder="sk-proj-..."
                            className="w-full rounded-lg border border-white/[0.1] bg-[#151515] px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/[0.2] focus:outline-none transition-colors"
                          />
                          <p className="mt-2 text-xs text-zinc-500 font-semibold">Used on this device for DeepFocus and the browser extension.</p>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex flex-col gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-4 text-sm leading-relaxed text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>Your key stays on your device and is never saved to DeepFocus servers.</span>
                        <button
                          type="button"
                          onClick={clearAiKeys}
                          className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white cursor-pointer"
                        >
                          Remove stored keys
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* INTEGRATIONS TAB */}
            {activeTab === "integrations" && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl space-y-8"
              >
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">Integrations</h1>
                  <p className="mt-1 text-sm text-zinc-400">Connect external services and the DeepFocus browser extension.</p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-medium text-white">Browser Extension</h3>
                  </div>

                  <div className="divide-y divide-white/[0.06]">
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.08]">
                          <Blocks size={20} className={extensionLinked ? "text-emerald-400" : "text-white"} />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">DeepFocus Companion</div>
                          <div className="mt-1 text-sm text-zinc-500 max-w-sm">
                            Syncs your LeetCode sessions, focus metrics, and code submissions directly to your dashboard.
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
                            <div className={`h-1.5 w-1.5 rounded-full ${extensionLinked ? "bg-emerald-500" : "bg-zinc-600"}`} />
                            <span className={extensionLinked ? "text-emerald-500" : "text-zinc-500"}>
                              {extensionLinked ? "Active Connection" : "Not Connected"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleConnectExtension}
                        disabled={isConnecting}
                        className={`shrink-0 flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors cursor-pointer ${
                          extensionLinked
                            ? "bg-white/[0.06] text-white border border-white/[0.06] hover:bg-white/[0.1]"
                            : "bg-white text-black hover:bg-zinc-200"
                        }`}
                      >
                        {extensionLinked ? (
                          <>
                            <Check size={16} className="text-emerald-400" />
                            Connected
                          </>
                        ) : isConnecting ? (
                          "Connecting..."
                        ) : (
                          "Pair Extension"
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {generatedToken && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-white/[0.01]">
                            <div className="mb-2 text-sm font-medium text-white">Secure Pairing Token</div>
                            <div className="mb-4 text-xs text-zinc-500">
                              Paste this token into the DeepFocus extension if it doesn't automatically connect.
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 overflow-x-auto rounded-lg border border-white/[0.08] bg-[#151515] px-4 py-2.5 font-mono text-sm text-zinc-300 whitespace-nowrap">
                                {generatedToken}
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedToken);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.06] border border-white/[0.06] text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
                                aria-label="Copy token"
                              >
                                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* BROADCAST CENTER TAB (ADMIN ONLY) */}
            {activeTab === "broadcast" && isAdmin && (
              <motion.div
                key="broadcast"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-10 text-zinc-300"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      <Megaphone className="text-violet-400" size={24} />
                      Broadcast Center
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">
                      Create in-app and email announcements for segments of your user base.
                    </p>
                  </div>

                  {/* MONITORING HEADER STATUS BAR */}
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-xs font-semibold">
                    <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">System Status</span>
                    <div className="w-px h-3 bg-white/10" />
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Activity size={14} className="animate-pulse" />
                      <span>Realtime WebSocket Online</span>
                    </div>
                  </div>
                </div>

                {/* FEATURE FLAGS SECTION */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] p-6">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
                    <Shield className="text-emerald-400" size={16} />
                    Global System Feature Flags
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(featureFlags).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleToggleFlag(key, val)}
                        className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all cursor-pointer ${
                          val 
                            ? "border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04]" 
                            : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02]"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-zinc-200 capitalize">{key.replace("_", " ")}</div>
                          <span className={`text-[10px] font-medium ${val ? "text-emerald-400" : "text-zinc-500"}`}>
                            {val ? "Active" : "Disabled"}
                          </span>
                        </div>
                        {val ? (
                          <ToggleRight size={28} className="text-emerald-400" />
                        ) : (
                          <ToggleLeft size={28} className="text-zinc-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graceful execution check on settings flag */}
                {!featureFlags.broadcast_center ? (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.02] p-8 text-center">
                    <AlertTriangle className="text-rose-500 mx-auto mb-3" size={32} />
                    <h3 className="text-sm font-bold text-white">Broadcast Center is Disabled</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      The broadcast engine has been turned off globally. Re-enable it in the feature flags section above to compose announcements.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                    
                    {/* COMPOSER FORM (Left Column) */}
                    <div className="xl:col-span-2 rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                      <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01] flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-white">Compose Announcement</h3>
                        
                        {estimatingLoading ? (
                          <span className="text-[10px] text-zinc-500 animate-pulse">Calculating recipients...</span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-bold bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                            Estimated Reach: {estimatedRecipients} User{estimatedRecipients === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                      <form onSubmit={triggerDeployConfirmation} className="p-6 space-y-4 text-xs">
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Title</label>
                            <input 
                              type="text" 
                              required
                              value={composer.title}
                              onChange={(e) => setComposer({ ...composer, title: e.target.value })}
                              placeholder="e.g., Leetcode Spaced Repetition Updates! 🧠"
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Type / Category</label>
                            <select 
                              value={composer.type}
                              onChange={(e) => setComposer({ ...composer, type: e.target.value })}
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              <option value="announcement">Announcement 📢</option>
                              <option value="system">System Info 🌐</option>
                              <option value="feature">New Feature ✨</option>
                              <option value="achievement">Achievement 🏆</option>
                              <option value="revision">Revision Task 📚</option>
                              <option value="warning">Alert Warning ⚠️</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Target Segment</label>
                            <select 
                              value={composer.target_segment}
                              onChange={(e) => setComposer({ ...composer, target_segment: e.target.value })}
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              <option value="all">All Users</option>
                              <option value="new">New Users (joined within 7d)</option>
                              <option value="active">Active Users (session in last 7d)</option>
                              <option value="inactive">Inactive Users (no session in 7d)</option>
                              <option value="premium">Premium Pro Subscribers</option>
                              <option value="beta">Beta Program Members</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Delivery Method</label>
                            <select 
                              value={composer.delivery_method}
                              onChange={(e) => setComposer({ ...composer, delivery_method: e.target.value })}
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                            >
                              <option value="in_app">In-App Only</option>
                              <option value="email">Email Only (via Resend)</option>
                              <option value="both">In-App + Email</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Message Details</label>
                          <textarea 
                            rows={4}
                            required
                            value={composer.message}
                            onChange={(e) => setComposer({ ...composer, message: e.target.value })}
                            placeholder="Write the announcement description..."
                            className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Scheduled Launch (Optional)</label>
                            <input 
                              type="datetime-local" 
                              value={composer.scheduled_for}
                              onChange={(e) => setComposer({ ...composer, scheduled_for: e.target.value })}
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Expires At (Optional)</label>
                            <input 
                              type="datetime-local" 
                              value={composer.expires_at}
                              onChange={(e) => setComposer({ ...composer, expires_at: e.target.value })}
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">Image URL (Optional)</label>
                            <input 
                              type="text" 
                              value={composer.image_url}
                              onChange={(e) => setComposer({ ...composer, image_url: e.target.value })}
                              placeholder="https://..."
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">CTA Label (Optional)</label>
                            <input 
                              type="text" 
                              value={composer.cta_text}
                              onChange={(e) => setComposer({ ...composer, cta_text: e.target.value })}
                              placeholder="e.g. Try it Now"
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                            />
                          </div>
                          <div>
                            <label className="block text-zinc-500 font-bold mb-1.5 uppercase tracking-wider">CTA Destination URL (Optional)</label>
                            <input 
                              type="text" 
                              value={composer.cta_url}
                              onChange={(e) => setComposer({ ...composer, cta_url: e.target.value })}
                              placeholder="e.g. /planner"
                              className="w-full bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                            />
                          </div>
                        </div>

                        {/* Deliverability Testing Module */}
                        {composer.delivery_method !== "in_app" && (
                          <div className="p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-3">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <Mail size={14} className="text-violet-400" />
                              Deliverability Testing Sandbox
                            </div>
                            <div className="flex gap-3">
                              <input 
                                type="email" 
                                value={testEmailAddress}
                                onChange={(e) => setTestEmailAddress(e.target.value)}
                                placeholder="Enter recipient email address..."
                                className="flex-1 bg-[#151515] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-violet-500"
                              />
                              <button
                                type="button"
                                onClick={handleSendTestBroadcast}
                                disabled={isTesting}
                                className="px-4 py-1.5 rounded-lg border border-violet-500/20 bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                              >
                                {isTesting ? <RefreshCw className="animate-spin" size={12} /> : <Send size={12} />}
                                Send Test Email
                              </button>
                            </div>
                            <p className="text-[10px] text-zinc-500">
                              Checks layout, sender signature, headers, and unsubscribe footers. Does not affect analytics metrics.
                            </p>
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isDeploying}
                            className="flex items-center justify-center gap-2 bg-white text-black py-2.5 px-6 rounded-lg font-bold hover:bg-zinc-200 transition-all w-full md:w-auto active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {isDeploying ? (
                              <>
                                <RefreshCw className="animate-spin" size={14} />
                                Deploying Campaign...
                              </>
                            ) : (
                              <>
                                <Megaphone size={14} />
                                Deploy Broadcast Campaign
                              </>
                            )}
                          </button>
                        </div>

                      </form>
                    </div>

                    {/* LIVE CARD PREVIEW (Right Column) */}
                    <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden sticky top-[100px]">
                      <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                        <h3 className="text-sm font-semibold text-white">Live In-App Preview</h3>
                      </div>
                      <div className="p-6 flex items-center justify-center min-h-[300px]">
                        
                        <div className="w-full max-w-sm rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-4 relative overflow-hidden backdrop-blur-md shadow-2xl">
                          <div className="flex gap-3 text-left">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${notifBgColors[composer.type] || notifBgColors.system}`}>
                              {notifIcons[composer.type] || notifIcons.system}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-white truncate">{composer.title || "No Title Specified"}</span>
                                <span className="text-[9px] text-zinc-500 font-medium">Just now</span>
                              </div>
                              <p className="text-[11px] text-zinc-400 leading-relaxed break-words whitespace-pre-wrap">
                                {composer.message || "Enter alert details in the composer form to preview the card in real-time."}
                              </p>

                              {composer.image_url && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-white/[0.04] bg-[#0c0c0c] max-h-24">
                                  <img src={composer.image_url} alt="Media preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                </div>
                              )}

                              {composer.cta_text && (
                                <div className="pt-2 flex">
                                  <span className="px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.04] text-[9px] font-bold text-zinc-200 flex items-center gap-1">
                                    {composer.cta_text}
                                    <Icon icon="solar:arrow-right-linear" width="10" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute right-3.5 top-3.5 w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
                        </div>

                      </div>
                    </div>

                  </div>
                )}

                {/* LOGS & ANALYTICS DASHBOARD */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-semibold text-white">Sent Announcements & Campaign Statistics</h3>
                  </div>
                  
                  {campaignsLoading ? (
                    <div className="p-8 space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-10 bg-white/[0.02] rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-xs">
                      <List size={24} className="mx-auto mb-2 text-zinc-600" />
                      No broadcast notifications have been dispatched.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.06] text-xs">
                      {campaigns.map((c) => {
                        const isExpanded = expandedCampaignId === c.id;
                        const analytics = activeAnalytics[c.id];
                        const isAnLoading = analyticsLoading[c.id];

                        // Calculate status
                        let statusText = "Active";
                        let statusColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
                        
                        if (!c.is_published) {
                          statusText = "Scheduled";
                          statusColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                        } else if (c.expires_at && new Date(c.expires_at) < new Date()) {
                          statusText = "Expired";
                          statusColor = "text-zinc-500 bg-white/[0.02] border-white/[0.04]";
                        }

                        return (
                          <div key={c.id} className="p-4 hover:bg-white/[0.01] transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-zinc-100 text-sm">{c.title}</span>
                                  <span className={`px-2 py-0.5 rounded border text-[9px] uppercase font-bold tracking-wide ${statusColor}`}>
                                    {statusText}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]">
                                    {c.delivery_method.replace("_", " ")}
                                  </span>
                                </div>
                                <div className="text-[10px] text-zinc-500 flex gap-4">
                                  <span>Segment: <strong className="text-zinc-400">{c.target_segment}</strong></span>
                                  <span>Category: <strong className="text-zinc-400">{c.type}</strong></span>
                                  <span>Launched: <strong className="text-zinc-400">{dayjs(c.scheduled_for).format("MMM D, YYYY h:mm A")}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleCampaignAnalytics(c.id)}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isExpanded 
                                      ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]" 
                                      : "bg-white/[0.04] border-white/[0.08] text-zinc-300 hover:text-white"
                                  }`}
                                >
                                  {isAnLoading ? <RefreshCw className="animate-spin" size={10} /> : <Eye size={10} />}
                                  {isExpanded ? "Hide Statistics" : "View Statistics"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCampaign(c.id)}
                                  className="p-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer active:scale-95"
                                  title="Retract / Delete Announcement"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* EXPANDABLE CAMPAIGN ANALYTICS LOGS */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 pt-4 border-t border-white/[0.06]">
                                    {isAnLoading ? (
                                      <div className="py-8 text-center text-zinc-500 flex justify-center items-center gap-2">
                                        <RefreshCw className="animate-spin" size={14} />
                                        Computing Campaign Analytics...
                                      </div>
                                    ) : analytics ? (
                                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 pt-2">
                                        
                                        {[
                                          { label: "Target Recipients", value: analytics.total_recipients, icon: <User size={12} /> },
                                          { label: "Unique Views", value: analytics.total_views, icon: <Eye size={12} /> },
                                          { label: "Unique Clicks", value: analytics.total_clicks, icon: <MousePointerClick size={12} /> },
                                          { label: "Read Rate", value: `${analytics.read_rate}%`, icon: <Check size={12} /> },
                                          { label: "Click-Through (CTR)", value: `${analytics.click_through_rate}%`, icon: <Sparkles size={12} /> },
                                          { label: "Emails Attempted", value: analytics.email_sent, icon: <Megaphone size={12} /> },
                                          { label: "Emails Delivered", value: analytics.email_delivered, icon: <Check size={12} /> },
                                          { label: "Emails Failed", value: analytics.email_failed, icon: <AlertTriangle size={12} /> },
                                        ].map((stat, idx) => (
                                          <div key={idx} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 space-y-1">
                                            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                                              {stat.icon}
                                              {stat.label}
                                            </div>
                                            <div className="text-base font-bold text-white">{stat.value}</div>
                                          </div>
                                        ))}

                                      </div>
                                    ) : (
                                      <div className="py-4 text-center text-zinc-500">No analytics data available for this campaign.</div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DELIVERABILITY FAILURE MONITORING LEDGER */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <AlertTriangle className="text-rose-500" size={14} />
                      Email Deliverability Monitoring Logs
                    </h3>
                  </div>
                  {failuresLoading ? (
                    <div className="p-6 text-center text-zinc-500">Syncing failure metrics...</div>
                  ) : deliveryFailures.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">
                      No delivery failures logged. Email pipeline healthy!
                    </div>
                  ) : (
                    <div className="overflow-x-auto text-[11px]">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Recipient</th>
                            <th className="p-4">Notification ID</th>
                            <th className="p-4">Error Log Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-zinc-400">
                          {deliveryFailures.map((f, i) => (
                            <tr key={i} className="hover:bg-rose-500/[0.01]">
                              <td className="p-4 whitespace-nowrap">{dayjs(f.created_at).format("MMM D, YYYY h:mm A")}</td>
                              <td className="p-4 text-zinc-300 font-semibold">{f.email}</td>
                              <td className="p-4 font-mono truncate max-w-[100px]">{f.notification_id}</td>
                              <td className="p-4 text-rose-400">{f.error_message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* AUDIT LOG TRAIL SECTION */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0c0c] overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/[0.06] bg-white/[0.01]">
                    <h3 className="text-sm font-semibold text-white">Administrative Audit Logs</h3>
                  </div>

                  {auditLogsLoading ? (
                    <div className="p-6 text-center text-zinc-500">Loading audit trail...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">No administrative actions logged.</div>
                  ) : (
                    <div className="overflow-x-auto text-[11px]">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b border-white/[0.06] text-zinc-500 font-bold uppercase tracking-wider">
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Admin ID</th>
                            <th className="p-4">Action</th>
                            <th className="p-4">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-zinc-400">
                          {auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.01]">
                              <td className="p-4 whitespace-nowrap">{dayjs(log.created_at).format("MMM D, YYYY h:mm A")}</td>
                              <td className="p-4 font-mono select-all truncate max-w-[120px]">{log.admin_user_id}</td>
                              <td className="p-4 whitespace-nowrap font-bold text-zinc-300">{log.action}</td>
                              <td className="p-4 max-w-sm truncate font-mono text-zinc-500">{JSON.stringify(log.metadata)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
