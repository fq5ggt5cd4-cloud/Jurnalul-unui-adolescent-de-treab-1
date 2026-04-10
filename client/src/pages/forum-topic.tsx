import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { ArrowLeft, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import NotFound from "./not-found";
import { ReactionButtons } from "@/components/reaction-buttons";
import { ReportButton } from "@/components/report-button";

export default function ForumTopicPage() {
  const { t, language } = useLang();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [replyText, setReplyText] = useState("");

  const topicId = parseInt(id || "0");

  const { data: topic, isLoading } = useQuery<any>({
    queryKey: ["/api/forum/topics", topicId],
    queryFn: async () => {
      const res = await fetch(`/api/forum/topics/${topicId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !isNaN(topicId),
  });

  const { data: replies = [] } = useQuery<any[]>({
    queryKey: ["/api/forum/topics", topicId, "replies"],
    queryFn: async () => {
      const res = await fetch(`/api/forum/topics/${topicId}/replies`);
      return res.json();
    },
    enabled: !isNaN(topicId),
  });

  const isAdmin = user?.role === "admin";

  const deleteTopic = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/forum/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/topics"] });
      setLocation("/forum");
    },
  });

  const deleteReply = useMutation({
    mutationFn: async (replyId: number) => {
      await apiRequest("DELETE", `/api/forum/replies/${replyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/topics", topicId, "replies"] });
    },
  });

  const addReply = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/forum/topics/${topicId}/replies`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/topics", topicId, "replies"] });
      setReplyText("");
    },
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addReply.mutate(replyText);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!topic) return <NotFound />;

  const canDeleteTopic = user && (user.id === topic.authorId || isAdmin);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/forum">
          <Button variant="ghost" className="mb-6 pl-0 transition-colors duration-200 hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('forum.back')}
          </Button>
        </Link>

        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold break-words flex-1">{topic.title}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <ReportButton contentType="forum_topic" contentId={topicId} />
            {canDeleteTopic && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    data-testid="btn-delete-topic"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("forum.topic.delete.confirm.title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("forum.topic.delete.confirm.desc")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteTopic.mutate()}
                      data-testid="btn-confirm-delete-topic"
                    >
                      {t("btn.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="text-sm text-muted-foreground mb-8 flex flex-wrap gap-1">
          <span>{t('forum.started.by')}</span> <span className="font-bold text-foreground">{topic.authorName}</span> <span>•</span>{" "}
          {formatDistanceToNow(new Date(topic.createdAt), {
            addSuffix: true,
            locale: language === "ro" ? ro : enUS,
          })}
        </div>

        <Separator className="my-6" />

        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare className="text-primary" />
          {t('forum.reply.count')} ({replies.length})
        </h3>

        <div className="space-y-6 mb-8">
          {replies.length === 0 && (
            <p className="text-muted-foreground text-center py-8 italic">
              {t('forum.no.replies')}
            </p>
          )}
          {replies.map((reply: any) => (
            <div key={reply.id} className="flex gap-4">
              <Avatar className="h-10 w-10 mt-1">
                <AvatarFallback>{reply.authorName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted/40 p-4 rounded-2xl rounded-tl-none">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm">{reply.authorName}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), {
                          addSuffix: true,
                          locale: language === "ro" ? ro : enUS,
                        })}
                      </span>
                      <ReportButton contentType="forum_reply" contentId={reply.id} />
                      {(user?.id === reply.authorId || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteReply.mutate(reply.id)}
                          disabled={deleteReply.isPending}
                          data-testid={`btn-delete-reply-${reply.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">{reply.content}</p>
                  <div className="mt-2 -ml-2">
                    <ReactionButtons contentType="forum_reply" contentId={reply.id} size="sm" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAuthenticated ? (
          <form onSubmit={handleReply} className="flex gap-3 sm:gap-4">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
              <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t('forum.write.reply')}
                className="mb-2"
                data-testid="input-forum-reply"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={addReply.isPending} className="transition-all duration-200 hover:scale-105" data-testid="btn-submit-reply">
                  {addReply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('forum.reply')}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-muted/30 p-4 rounded-lg text-center">
            <p className="mb-2 text-muted-foreground">{t('forum.login.reply')}</p>
            <Link href="/auth">
              <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">{t('nav.login')}</Button>
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
