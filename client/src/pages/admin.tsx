import { useState } from "react";
import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Users, FileText, MessageSquare, Flag, Activity, Shield, ShieldOff,
  Ban, Unlock, Trash2, Eye, EyeOff, CheckCircle, XCircle, Loader2,
  BarChart3, Search, Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";

export default function AdminPage() {
  const { t, language } = useLang();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; userId: number; username: string }>({ open: false, userId: 0, username: "" });
  const [blockReason, setBlockReason] = useState("");
  const [blockUntil, setBlockUntil] = useState("");
  const dateFnsLocale = language === "ro" ? ro : enUS;

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-3xl font-bold mb-2" data-testid="text-admin-forbidden">{t("editor.forbidden.title")}</h1>
          <p className="text-muted-foreground">{t("admin.forbidden.desc")}</p>
        </div>
      </Layout>
    );
  }

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats").then(r => r.json()),
  });

  const { data: usersList, isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users", userSearch],
    queryFn: () => fetch(`/api/admin/users?search=${encodeURIComponent(userSearch)}`).then(r => r.json()),
  });

  const { data: reportsList } = useQuery<any[]>({
    queryKey: ["/api/admin/reports"],
    queryFn: () => fetch("/api/admin/reports").then(r => r.json()),
  });

  const { data: activityLogs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-logs"],
    queryFn: () => fetch("/api/admin/activity-logs?limit=200").then(r => r.json()),
  });

  const { data: allPosts } = useQuery<any[]>({
    queryKey: ["/api/admin/posts"],
    queryFn: () => fetch("/api/admin/posts").then(r => r.json()),
  });

  const { data: allComments } = useQuery<any[]>({
    queryKey: ["/api/admin/comments"],
    queryFn: () => fetch("/api/admin/comments").then(r => r.json()),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiRequest("PUT", `/api/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("admin.role.updated") });
    },
    onError: (err: any) => toast({ title: t("admin.error"), description: err.message, variant: "destructive" }),
  });

  const blockMutation = useMutation({
    mutationFn: ({ id, blockReason, blockedUntil }: { id: number; blockReason: string; blockedUntil?: string }) =>
      apiRequest("PUT", `/api/admin/users/${id}/block`, { blockReason, blockedUntil: blockedUntil || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setBlockDialog({ open: false, userId: 0, username: "" });
      setBlockReason("");
      setBlockUntil("");
      toast({ title: t("admin.user.blocked") });
    },
    onError: (err: any) => toast({ title: t("admin.error"), description: err.message, variant: "destructive" }),
  });

  const unblockMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/users/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: t("admin.user.unblocked") });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("admin.user.deleted") });
    },
    onError: (err: any) => toast({ title: t("admin.error"), description: err.message, variant: "destructive" }),
  });

  const togglePostHidden = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/posts/${id}/toggle-hidden`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      toast({ title: t("admin.content.updated") });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/posts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("admin.post.deleted") });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/comments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("admin.comment.deleted") });
    },
  });

  const toggleCommentHidden = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/admin/comments/${id}/toggle-hidden`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/comments"] });
    },
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PUT", `/api/admin/reports/${id}/resolve`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: t("admin.report.resolved") });
    },
  });

  const pendingReports = reportsList?.filter(r => r.status === "pending") || [];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold font-hand" data-testid="text-admin-title">{t("admin.title")}</h1>
          {pendingReports.length > 0 && (
            <Badge variant="destructive" className="text-sm">{pendingReports.length} {t("admin.pending")}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.users || 0}</p>
                <p className="text-xs text-muted-foreground">{t("admin.stat.users")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.posts || 0}</p>
                <p className="text-xs text-muted-foreground">{t("admin.stat.posts")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.comments || 0}</p>
                <p className="text-xs text-muted-foreground">{t("admin.stat.comments")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Flag className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.reports || 0}</p>
                <p className="text-xs text-muted-foreground">{t("admin.stat.reports")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.forumTopics || 0}</p>
                <p className="text-xs text-muted-foreground">{t("admin.stat.topics")}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto">
            <TabsTrigger value="users" data-testid="tab-users">{t("admin.tab.users")}</TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">{t("admin.tab.content")}</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-reports">
              {t("admin.tab.reports")}
              {pendingReports.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[10px] px-1">{pendingReports.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" data-testid="tab-logs">{t("admin.tab.logs")}</TabsTrigger>
            <TabsTrigger value="gdpr" data-testid="tab-gdpr">GDPR</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span>{t("admin.users.title")}</span>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={t("admin.users.search")}
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-user-search"
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {usersList?.map((u: any) => (
                      <div key={u.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-3" data-testid={`user-row-${u.id}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            {u.username[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.username}</span>
                              {u.role === "admin" && (
                                <Badge variant="default" className="text-[10px] py-0 px-1 gap-0.5">
                                  <Shield className="w-3 h-3" /> Admin
                                </Badge>
                              )}
                              {u.isBlocked && (
                                <Badge variant="destructive" className="text-[10px] py-0 px-1">
                                  <Ban className="w-3 h-3 mr-0.5" /> {t("admin.blocked")}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 sm:shrink-0">
                          {u.id !== user?.id && (
                            <>
                              {u.role === "user" ? (
                                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => roleMutation.mutate({ id: u.id, role: "admin" })} data-testid={`btn-promote-${u.id}`}>
                                  <Shield className="w-3 h-3" /> {t("admin.promote")}
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => roleMutation.mutate({ id: u.id, role: "user" })} data-testid={`btn-demote-${u.id}`}>
                                  <ShieldOff className="w-3 h-3" /> {t("admin.demote")}
                                </Button>
                              )}
                              {u.isBlocked ? (
                                <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600" onClick={() => unblockMutation.mutate(u.id)} data-testid={`btn-unblock-${u.id}`}>
                                  <Unlock className="w-3 h-3" /> {t("admin.unblock")}
                                </Button>
                              ) : u.role !== "admin" ? (
                                <Button size="sm" variant="outline" className="gap-1 text-xs text-red-600" onClick={() => setBlockDialog({ open: true, userId: u.id, username: u.username })} data-testid={`btn-block-${u.id}`}>
                                  <Ban className="w-3 h-3" /> {t("admin.block")}
                                </Button>
                              ) : null}
                              <Button size="sm" variant="ghost" className="text-red-600 text-xs" onClick={() => { if (confirm(t("admin.confirm.delete.user"))) deleteUserMutation.mutate(u.id); }} data-testid={`btn-delete-user-${u.id}`}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!usersList || usersList.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">{t("admin.no.users")}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.articles")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allPosts?.map((p: any) => (
                      <div key={p.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-2 ${p.isHidden ? 'opacity-50 bg-red-50 dark:bg-red-950/20' : 'bg-card'}`} data-testid={`post-row-${p.id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium break-words">{p.title}</span>
                            <Badge variant="secondary" className="text-[10px]">{p.category}</Badge>
                            {p.isHidden && <Badge variant="destructive" className="text-[10px]">{t("admin.hidden")}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{t("archive.by")} {p.authorName} · {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: dateFnsLocale })}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => togglePostHidden.mutate(p.id)} data-testid={`btn-toggle-post-${p.id}`}>
                            {p.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm(t("admin.confirm.delete.post"))) deletePostMutation.mutate(p.id); }} data-testid={`btn-delete-post-${p.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!allPosts || allPosts.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">{t("admin.no.posts")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.comments")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {allComments?.slice(0, 50).map((c: any) => (
                      <div key={c.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-2 ${c.isHidden ? 'opacity-50 bg-red-50 dark:bg-red-950/20' : 'bg-card'}`} data-testid={`comment-row-${c.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words">{c.content.replace(/<[^>]*>/g, "").slice(0, 100)}</p>
                          <p className="text-xs text-muted-foreground">{t("archive.by")} {c.authorName} · on "{c.postTitle}"</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleCommentHidden.mutate(c.id)}>
                            {c.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { if (confirm(t("admin.confirm.delete.comment"))) deleteCommentMutation.mutate(c.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {(!allComments || allComments.length === 0) && (
                      <p className="text-center text-muted-foreground py-4">{t("admin.no.comments")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.reports.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportsList?.map((r: any) => (
                    <div key={r.id} className="p-4 rounded-lg border bg-card" data-testid={`report-row-${r.id}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant={r.status === "pending" ? "destructive" : r.status === "resolved" ? "default" : "secondary"} className="text-[10px]">
                              {r.status === "pending" ? t("admin.report.pending") : r.status === "resolved" ? t("admin.report.resolved.label") : t("admin.report.dismissed")}
                            </Badge>
                            <span className="text-sm font-medium">{r.contentType} #{r.contentId}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1 break-words">{r.reason}</p>
                          <p className="text-xs text-muted-foreground">{t("admin.reported.by")} {r.reporterName} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: dateFnsLocale })}</p>
                        </div>
                        {r.status === "pending" && (
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" className="gap-1 text-xs text-green-600" onClick={() => resolveReportMutation.mutate({ id: r.id, status: "resolved" })} data-testid={`btn-resolve-${r.id}`}>
                              <CheckCircle className="w-3 h-3" /> {t("admin.resolve")}
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => resolveReportMutation.mutate({ id: r.id, status: "dismissed" })} data-testid={`btn-dismiss-${r.id}`}>
                              <XCircle className="w-3 h-3" /> {t("admin.dismiss")}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!reportsList || reportsList.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">{t("admin.no.reports")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t("admin.logs.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {activityLogs?.map((log: any) => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2 rounded border bg-card text-sm" data-testid={`log-row-${log.id}`}>
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        <span className="font-medium shrink-0">{log.username || "System"}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{log.action}</Badge>
                        {log.details && <span className="text-muted-foreground break-words text-xs sm:text-sm">{log.details}</span>}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 pl-4 sm:pl-0">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: dateFnsLocale })}
                      </span>
                    </div>
                  ))}
                  {(!activityLogs || activityLogs.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">{t("admin.no.logs")}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gdpr">
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.gdpr.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-bold mb-2">{t("admin.gdpr.retention.title")}</h3>
                  <p className="text-sm text-muted-foreground">{t("admin.gdpr.retention.text")}</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-bold mb-2">{t("admin.gdpr.rights.title")}</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• {t("admin.gdpr.rights.access")}</li>
                    <li>• {t("admin.gdpr.rights.rectification")}</li>
                    <li>• {t("admin.gdpr.rights.erasure")}</li>
                    <li>• {t("admin.gdpr.rights.portability")}</li>
                    <li>• {t("admin.gdpr.rights.object")}</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <h3 className="font-bold mb-2">{t("admin.gdpr.export.title")}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{t("admin.gdpr.export.text")}</p>
                  <p className="text-xs text-muted-foreground italic">{t("admin.gdpr.export.note")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ ...blockDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.block.title")} {blockDialog.username}</DialogTitle>
            <DialogDescription>{t("admin.block.desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t("admin.block.reason")}</label>
              <Input value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder={t("admin.block.reason.placeholder")} data-testid="input-block-reason" />
            </div>
            <div>
              <label className="text-sm font-medium">{t("admin.block.until")}</label>
              <Input type="datetime-local" value={blockUntil} onChange={(e) => setBlockUntil(e.target.value)} data-testid="input-block-until" />
              <p className="text-xs text-muted-foreground mt-1">{t("admin.block.permanent.note")}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, userId: 0, username: "" })}>{t("btn.cancel")}</Button>
            <Button variant="destructive" onClick={() => blockMutation.mutate({ id: blockDialog.userId, blockReason, blockedUntil: blockUntil || undefined })} data-testid="btn-confirm-block">
              <Ban className="w-4 h-4 mr-2" /> {t("admin.block")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
