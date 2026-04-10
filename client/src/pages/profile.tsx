import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  Loader2,
  Shield,
  User as UserIcon,
  CalendarDays,
  MessageSquare,
  FileText,
  Trash2,
  AlertTriangle,
  Download,
  Pencil,
  KeyRound,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProfileData {
  id: number;
  username: string;
  role: string;
  avatar: string | null;
  createdAt: string;
  stats: {
    forumTopics: number;
    forumReplies: number;
    posts: number;
  };
  forumTopics: any[];
  posts: any[];
}

export default function ProfilePage() {
  const { t, language } = useLang();
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ["/api/users", username],
    queryFn: async () => {
      const res = await fetch(`/api/users/${username}`);
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/auth/delete-account", { password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setDeleteDialogOpen(false);
      toast({
        title: t("profile.deleted.title"),
        description: t("profile.deleted.desc"),
      });
      setLocation("/");
    },
    onError: (err: Error) => {
      toast({
        title: t("profile.delete.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (newPassword && newPassword !== confirmPassword) {
        throw new Error(t("profile.edit.passwords.mismatch"));
      }
      const body: Record<string, string> = {};
      if (newUsername.trim() && newUsername.trim() !== profile?.username) {
        body.username = newUsername.trim();
      }
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      if (Object.keys(body).length === 0) {
        throw new Error(t("profile.edit.no.changes"));
      }
      const res = await apiRequest("PUT", "/api/auth/profile", body);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t("profile.edit.error"));
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", username] });
      toast({
        title: t("profile.edit.success"),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (data.username && data.username !== username) {
        setLocation(`/profile/${data.username}`);
      }
    },
    onError: (err: Error) => {
      toast({
        title: t("profile.edit.error"),
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const isOwnProfile = isAuthenticated && currentUser?.username === username;
  const isGoogleUser = !!(currentUser?.avatar?.includes("google") || currentUser?.avatar?.includes("googleusercontent"));

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-muted-foreground">{t("profile.notfound")}</h2>
          <Link href="/">
            <Button className="mt-4">{t("notfound.back")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 pl-0 hover:bg-transparent hover:text-primary" data-testid="btn-back-home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("btn.back")}
          </Button>
        </Link>

        <Card className="mb-8 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/30 to-secondary/30" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar || undefined} alt={profile.username} />
                <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                  {profile.username[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left pb-2">
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold" data-testid="text-profile-username">{profile.username}</h1>
                  <Badge
                    variant={profile.role === "admin" ? "default" : "secondary"}
                    className="gap-1"
                    data-testid="badge-profile-role"
                  >
                    {profile.role === "admin" ? (
                      <Shield className="w-3 h-3" />
                    ) : (
                      <UserIcon className="w-3 h-3" />
                    )}
                    {profile.role === "admin" ? t("profile.role.admin") : t("profile.role.user")}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <CalendarDays className="w-4 h-4" />
                  {t("profile.joined")}{" "}
                  {format(new Date(profile.createdAt), "PPP", {
                    locale: language === "ro" ? ro : enUS,
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="text-center p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-primary">{profile.stats.forumTopics}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("profile.stat.topics")}</div>
          </Card>
          <Card className="text-center p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl font-bold text-primary">{profile.stats.forumReplies}</div>
            <div className="text-sm text-muted-foreground mt-1">{t("profile.stat.replies")}</div>
          </Card>
          {profile.role === "admin" && (
            <Card className="text-center p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl font-bold text-primary">{profile.stats.posts}</div>
              <div className="text-sm text-muted-foreground mt-1">{t("profile.stat.articles")}</div>
            </Card>
          )}
        </div>

        {profile.role === "admin" && profile.posts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {t("profile.published.articles")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.posts.map((post: any) => (
                  <Link key={post.id} href={`/article/${post.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer gap-1" data-testid={`link-post-${post.id}`}>
                      <span className="font-medium break-words">{post.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(post.createdAt), "PP", {
                          locale: language === "ro" ? ro : enUS,
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profile.forumTopics.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                {t("profile.forum.activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profile.forumTopics.map((topic: any) => (
                  <Link key={topic.id} href={`/forum/${topic.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer gap-1" data-testid={`link-topic-${topic.id}`}>
                      <span className="font-medium break-words">{topic.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(topic.createdAt), "PP", {
                          locale: language === "ro" ? ro : enUS,
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isOwnProfile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                {t("profile.edit.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <UserIcon className="w-4 h-4 text-primary" />
                  {t("profile.edit.username")}
                </div>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder={profile.username}
                  data-testid="input-new-username"
                />
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="w-3 h-3 mt-0.5 shrink-0" />
                  {t("profile.edit.username.hint")}
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <KeyRound className="w-4 h-4 text-primary" />
                  {t("profile.edit.new.password")}
                </div>
                {isGoogleUser ? (
                  <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                    <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                    {t("profile.edit.google.note")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("profile.edit.current.password")}</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t("profile.edit.current.password.placeholder")}
                        data-testid="input-current-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("profile.edit.new.password")}</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("profile.edit.new.password.placeholder")}
                        data-testid="input-new-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{t("profile.edit.confirm.password")}</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t("profile.edit.confirm.password.placeholder")}
                        data-testid="input-confirm-password"
                      />
                    </div>
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {t("profile.edit.passwords.mismatch")}
                      </p>
                    )}
                    {newPassword && confirmPassword && newPassword === confirmPassword && (
                      <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("profile.edit.confirm.password")}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => updateProfile.mutate()}
                disabled={updateProfile.isPending}
                className="w-full sm:w-auto gap-2"
                data-testid="btn-save-profile"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                {t("profile.edit.save")}
              </Button>
            </CardContent>
          </Card>
        )}

        {isOwnProfile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                {t("profile.export.btn")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("profile.export.desc")}
              </p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  window.open("/api/auth/export-data", "_blank");
                }}
                data-testid="btn-export-data"
              >
                <Download className="w-4 h-4" />
                {t("profile.export.btn")}
              </Button>
            </CardContent>
          </Card>
        )}

        {isOwnProfile && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                {t("profile.danger.zone")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("profile.delete.warning")}
              </p>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" data-testid="btn-delete-account">
                    <Trash2 className="w-4 h-4" />
                    {t("profile.delete.btn")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-5 h-5" />
                      {t("profile.delete.confirm.title")}
                    </DialogTitle>
                    <DialogDescription>
                      {t("profile.delete.confirm.desc")}
                    </DialogDescription>
                  </DialogHeader>
                  {currentUser && !currentUser.avatar?.includes("google") && (
                    <div className="space-y-2 py-2">
                      <Label>{t("auth.password")}</Label>
                      <Input
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder={t("profile.delete.password.placeholder")}
                        data-testid="input-delete-password"
                      />
                    </div>
                  )}
                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      {t("btn.cancel")}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => deleteAccount.mutate(deletePassword)}
                      disabled={deleteAccount.isPending}
                      data-testid="btn-confirm-delete"
                    >
                      {deleteAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      {t("profile.delete.confirm.btn")}
                    </Button>
                  </DialogFooter>
                  {deleteAccount.error && (
                    <p className="text-sm text-destructive mt-2" data-testid="text-delete-error">
                      {(deleteAccount.error as Error).message}
                    </p>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
