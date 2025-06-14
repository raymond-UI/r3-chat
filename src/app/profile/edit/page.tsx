"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  Globe,
  Save,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// Types for better type safety
interface SocialLinks {
  twitter: string;
  github: string;
  linkedin: string;
  website: string;
}

interface ShowcaseSettings {
  showFeaturedFirst: boolean;
  groupByTags: boolean;
  showStats: boolean;
  allowSearch: boolean;
}

interface FormData {
  username: string;
  displayName: string;
  role: string;
  isPublic: boolean;
  customSlug: string;
  socialLinks: SocialLinks;
  showcaseSettings: ShowcaseSettings;
}

// Constants to prevent re-creation
const INITIAL_FORM_DATA: FormData = {
  username: "",
  displayName: "",
  role: "",
  isPublic: false,
  customSlug: "",
  socialLinks: {
    twitter: "",
    github: "",
    linkedin: "",
    website: "",
  },
  showcaseSettings: {
    showFeaturedFirst: true,
    groupByTags: false,
    showStats: true,
    allowSearch: true,
  },
} as const;

// URL validation regex patterns
const URL_PATTERNS = {
  github: /^https:\/\/(www\.)?github\.com\/[a-zA-Z0-9-_]+\/?$/,
  twitter: /^https:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?$/,
  linkedin: /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-_]+\/?$/,
  website: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
} as const;

export default function ProfileEditPage() {
  const { user } = useUser();
  const router = useRouter();
  const { profile, createProfile, isCreatingProfile, hasProfile } =
    useUserProfile();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof FormData | keyof SocialLinks, string>>
  >({});

  // Memoized profile URL to prevent unnecessary recalculations
  const profileUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/u/${formData.customSlug || formData.username}`;
  }, [formData.customSlug, formData.username]);

  // Memoized initial data to prevent unnecessary re-renders
  const initialUserData = useMemo(() => {
    if (!user) return null;
    return {
      username:
        user.username ||
        user.emailAddresses[0]?.emailAddress.split("@")[0] ||
        "",
      displayName: user.fullName || "",
    };
  }, [user]);

  // Initialize form with existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        username: profile.username || "",
        displayName: profile.displayName || "",
        role: profile.role || "",
        isPublic: profile.isPublic || false,
        customSlug: profile.customSlug || "",
        socialLinks: {
          twitter: profile.socialLinks?.twitter || "",
          github: profile.socialLinks?.github || "",
          linkedin: profile.socialLinks?.linkedin || "",
          website: profile.socialLinks?.website || "",
        },
        showcaseSettings:
          profile.showcaseSettings || INITIAL_FORM_DATA.showcaseSettings,
      });
    } else if (initialUserData && !hasProfile) {
      setFormData((prev) => ({
        ...prev,
        ...initialUserData,
      }));
    }
  }, [profile, initialUserData, hasProfile]);

  // Validation functions
  const validateUsername = useCallback((username: string): string | null => {
    if (!username.trim()) return "Username is required";
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 30) return "Username must be less than 30 characters";
    if (!/^[a-zA-Z0-9-_]+$/.test(username))
      return "Username can only contain letters, numbers, hyphens, and underscores";
    return null;
  }, []);

  const validateSocialLink = useCallback(
    (platform: keyof typeof URL_PATTERNS, url: string): string | null => {
      if (!url) return null; // Optional fields
      if (!URL_PATTERNS[platform].test(url)) {
        return `Please enter a valid ${platform} URL`;
      }
      return null;
    },
    []
  );

  const validateForm = useCallback((): boolean => {
    const errors: typeof validationErrors = {};

    // Username validation
    const usernameError = validateUsername(formData.username);
    if (usernameError) errors.username = usernameError;

    // Bio length validation
    if (formData.role.length > 500) {
      errors.role = "Role must be less than 500 characters";
    }

    // Custom slug validation
    if (formData.customSlug && formData.customSlug.length > 0) {
      const slugError = validateUsername(formData.customSlug);
      if (slugError)
        errors.customSlug = slugError.replace("Username", "Custom URL");
    }

    // Social links validation
    const socialPlatforms = Object.keys(
      formData.socialLinks
    ) as (keyof SocialLinks)[];
    socialPlatforms.forEach((platform) => {
      const error = validateSocialLink(
        platform,
        formData.socialLinks[platform]
      );
      if (error) errors[platform] = error;
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateUsername, validateSocialLink]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        toast.error("Please fix the validation errors");
        return;
      }

      try {
        await createProfile(formData);
        toast.success("Profile saved successfully!");
        router.push(`/u/${formData.customSlug || formData.username}`);
      } catch (error) {
        // Error is handled in the hook, but we can add additional handling here
        console.error("Profile creation failed:", error);
      }
    },
    [formData, validateForm, createProfile, router]
  );

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear validation error when user starts typing
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  const handleSocialLinksChange = useCallback(
    (platform: keyof SocialLinks, value: string) => {
      setFormData((prev) => ({
        ...prev,
        socialLinks: { ...prev.socialLinks, [platform]: value },
      }));

      // Clear validation error
      if (validationErrors[platform]) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[platform];
          return newErrors;
        });
      }
    },
    [validationErrors]
  );

  const handleShowcaseSettingsChange = useCallback(
    (setting: keyof ShowcaseSettings, value: boolean) => {
      setFormData((prev) => ({
        ...prev,
        showcaseSettings: { ...prev.showcaseSettings, [setting]: value },
      }));
    },
    []
  );

  // Early returns for loading/error states
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground">
            Please sign in to edit your profile.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Profile</h1>
            <p className="text-muted-foreground">
              {hasProfile
                ? "Update your public profile settings"
                : "Create your public profile to showcase your conversations"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <Tabs defaultValue="basic" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">
                <User className="w-4 h-4 mr-2" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="social">
                <ExternalLink className="w-4 h-4 mr-2" />
                Social Links
              </TabsTrigger>
              <TabsTrigger value="showcase">
                <Settings className="w-4 h-4 mr-2" />
                Showcase Settings
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        handleInputChange("username", e.target.value)
                      }
                      placeholder="your-username"
                      required
                      aria-invalid={!!validationErrors.username}
                      aria-describedby={
                        validationErrors.username ? "username-error" : undefined
                      }
                    />
                    {validationErrors.username && (
                      <p
                        id="username-error"
                        className="text-sm text-destructive"
                      >
                        {validationErrors.username}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Your unique username for your profile URL
                    </p>
                  </div>

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) =>
                        handleInputChange("displayName", e.target.value)
                      }
                      placeholder="Your Full Name"
                      maxLength={100}
                    />
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) =>
                        handleInputChange("role", e.target.value)
                      }
                      placeholder="Your role or title"
                      aria-invalid={!!validationErrors.role}
                      aria-describedby={
                        validationErrors.role ? "role-error" : "role-help"
                      }
                    />
                    {validationErrors.role && (
                      <p id="role-error" className="text-sm text-destructive">
                        {validationErrors.role}
                      </p>
                    )}
                  </div>

                  {/* Custom Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="customSlug">Custom URL (Optional)</Label>
                    <Input
                      id="customSlug"
                      value={formData.customSlug}
                      onChange={(e) =>
                        handleInputChange("customSlug", e.target.value)
                      }
                      placeholder="custom-url"
                      aria-invalid={!!validationErrors.customSlug}
                      aria-describedby={
                        validationErrors.customSlug
                          ? "customSlug-error"
                          : undefined
                      }
                    />
                    {validationErrors.customSlug && (
                      <p
                        id="customSlug-error"
                        className="text-sm text-destructive"
                      >
                        {validationErrors.customSlug}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Create a custom URL instead of using your username
                    </p>
                  </div>

                  <Separator />

                  {/* Public Profile Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Public Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        Make your profile and conversations visible to others
                      </p>
                    </div>
                    <Switch
                      checked={formData.isPublic}
                      onCheckedChange={(checked) =>
                        handleInputChange("isPublic", checked)
                      }
                      aria-label="Make profile public"
                    />
                  </div>

                  {/* Profile URL Preview */}
                  {formData.isPublic &&
                    (formData.username || formData.customSlug) && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <Label className="text-sm font-medium">
                          Your Profile URL
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <code className="text-sm break-all">
                            {profileUrl}
                          </code>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Preview profile"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Links Tab */}
            <TabsContent value="social" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Social Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(
                      Object.keys(formData.socialLinks) as (keyof SocialLinks)[]
                    ).map((platform) => (
                      <div key={platform} className="space-y-2">
                        <Label htmlFor={platform} className="capitalize">
                          {platform === "github"
                            ? "GitHub"
                            : platform === "linkedin"
                              ? "LinkedIn"
                              : platform}
                        </Label>
                        <Input
                          id={platform}
                          type="url"
                          value={formData.socialLinks[platform]}
                          onChange={(e) =>
                            handleSocialLinksChange(platform, e.target.value)
                          }
                          placeholder={`https://${platform === "github" ? "github.com" : platform === "twitter" ? "twitter.com" : platform === "linkedin" ? "linkedin.com/in" : "yourwebsite.com"}/username`}
                          aria-invalid={!!validationErrors[platform]}
                          aria-describedby={
                            validationErrors[platform]
                              ? `${platform}-error`
                              : undefined
                          }
                        />
                        {validationErrors[platform] && (
                          <p
                            id={`${platform}-error`}
                            className="text-sm text-destructive"
                          >
                            {validationErrors[platform]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Showcase Settings Tab */}
            <TabsContent value="showcase" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Showcase</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {(
                      Object.entries(formData.showcaseSettings) as [
                        keyof ShowcaseSettings,
                        boolean,
                      ][]
                    ).map(([setting, value]) => {
                      const labels = {
                        showFeaturedFirst: {
                          title: "Show Featured First",
                          description:
                            "Display featured conversations at the top",
                        },
                        groupByTags: {
                          title: "Group by Tags",
                          description: "Organize conversations by topic tags",
                        },
                        showStats: {
                          title: "Show Statistics",
                          description:
                            "Display view counts and engagement metrics",
                        },
                        allowSearch: {
                          title: "Allow Search",
                          description:
                            "Let others find your profile in search results",
                        },
                      };

                      return (
                        <div
                          key={setting}
                          className="flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <Label>{labels[setting].title}</Label>
                            <p className="text-sm text-muted-foreground">
                              {labels[setting].description}
                            </p>
                          </div>
                          <Switch
                            checked={value}
                            onCheckedChange={(checked) =>
                              handleShowcaseSettingsChange(setting, checked)
                            }
                            aria-label={labels[setting].title}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end gap-4 pt-6">
            <Button variant="outline" asChild disabled={isCreatingProfile}>
              <Link href="/chat">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isCreatingProfile}>
              <Save className="w-4 h-4 mr-2" />
              {isCreatingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
