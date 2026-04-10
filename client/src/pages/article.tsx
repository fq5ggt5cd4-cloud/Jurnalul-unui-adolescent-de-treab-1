import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  ArrowLeft,
  MessageSquare,
  Trash2,
  Loader2,
  PenLine,
  Calendar,
  Eye,
  Share2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import NotFound from "./not-found";
import { FadeSlideUp, SlideFromLeft, StaggerContainer, StaggerItem } from "@/components/animations";
import { CategoryIcon } from "@/components/category-icon";
import { ReactionButtons } from "@/components/reaction-buttons";
import { ShareButton } from "@/components/share-modal";
import { ReportButton } from "@/components/report-button";

export default function ArticlePage() {
  const { t, language } = useLang();
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [commentText, setCommentText] = useState("");
  const viewTracked = useRef(false);

  const postId = parseInt(id || "0");

  const { data: post, isLoading: postLoading } = useQuery<any>({
    queryKey: ["/api/posts", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !isNaN(postId),
  });

  const { data: comments = [] } = useQuery<any[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`);
      return res.json();
    },
    enabled: !isNaN(postId),
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest(
        "POST",
        `/api/posts/${postId}/comments`,
        { content }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", postId, "comments"],
      });
      setCommentText("");
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/posts", postId, "comments"],
      });
    },
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/latest"] });
      setLocation(post?.category ? `/section/${post.category}` : "/");
    },
  });

  const handleComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate(commentText);
  };

  useEffect(() => {
    if (post && !viewTracked.current) {
      viewTracked.current = true;
      fetch(`/api/posts/${postId}/view`, { method: "POST" }).catch(() => {});
    }
  }, [post, postId]);


  if (postLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post) return <NotFound />;

  const isAdmin = user?.role === "admin";
  const isHtml = post.content?.includes("<");

  return (
    <Layout>
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/8 via-primary/4 to-transparent dark:from-primary/12 dark:via-primary/6 pointer-events-none" />

        <div className="relative container mx-auto px-4 py-8 max-w-4xl">
          <Link href={`/section/${post.category}`}>
            <Button
              variant="ghost"
              className="mb-6 pl-0 hover:bg-transparent hover:text-primary"
              data-testid="btn-back-article"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("btn.back")}
            </Button>
          </Link>

          <FadeSlideUp>
            <article>
              <div className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <Badge variant="secondary" className="uppercase text-[10px] tracking-wider font-bold gap-1.5 px-3 py-1">
                    <CategoryIcon category={post.category} className="w-3.5 h-3.5" strokeWidth={2} />
                    {t(`category.${post.category}`) || post.category}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(post.createdAt), {
                      addSuffix: true,
                      locale: language === "ro" ? ro : enUS,
                    })}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-view-count">
                    <Eye className="w-3.5 h-3.5" />
                    {post.views || 0} {t("article.views")}
                  </span>
                  {(post.shares || 0) > 0 && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="text-share-count">
                      <Share2 className="w-3.5 h-3.5" />
                      {post.shares} {t("article.shares")}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-6">
                  {post.title}
                </h1>

                <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
              </div>

              <div className="relative">
                <div className="absolute -left-4 sm:-left-6 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/30 via-secondary/20 to-transparent rounded-full hidden md:block" />

                {isHtml ? (
                  <div
                    className="bg-card rounded-2xl p-6 sm:p-10 shadow-lg border border-border/50 mb-8 prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-blockquote:border-primary/30 prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-img:rounded-xl prose-img:shadow-md"
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  />
                ) : (
                  <div className="bg-card rounded-2xl p-6 sm:p-10 shadow-lg border border-border/50 mb-8 whitespace-pre-wrap leading-relaxed text-base sm:text-lg text-foreground">
                    {post.content}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-12">
                <ReactionButtons contentType="post" contentId={postId} />
                <ShareButton postId={postId} title={post.title} />
                {isAdmin && (
                  <Link href={`/editor/${postId}`}>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full hover:bg-primary/5 transition-colors"
                      data-testid="btn-edit-post"
                    >
                      <PenLine className="w-4 h-4" /> {t('btn.edit')}
                    </Button>
                  </Link>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => deletePost.mutate()}
                    disabled={deletePost.isPending}
                    data-testid="btn-delete-post"
                  >
                    <Trash2 className="w-4 h-4" /> {t('btn.delete')}
                  </Button>
                )}
              </div>
            </article>
          </FadeSlideUp>

          <Separator className="my-8" />

          <section>
            <FadeSlideUp delay={0.1}>
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <MessageSquare className="text-primary" />
                {t('article.comments')} ({comments.length})
              </h3>
            </FadeSlideUp>

            {isAuthenticated ? (
              <FadeSlideUp delay={0.15}>
                <div className="flex gap-4 mb-8">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{user?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <form onSubmit={handleComment} className="flex-1">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t('article.add.comment')}
                      className="mb-2"
                      data-testid="input-comment"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={addComment.isPending}
                        data-testid="btn-submit-comment"
                      >
                        {addComment.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {t('article.post.comment')}
                      </Button>
                    </div>
                  </form>
                </div>
              </FadeSlideUp>
            ) : (
              <FadeSlideUp delay={0.15}>
                <div className="bg-muted/30 p-4 rounded-lg text-center mb-8">
                  <p className="mb-2 text-muted-foreground">
                    {t('article.login.comment')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation("/auth")}
                  >
                    {t('nav.login')}
                  </Button>
                </div>
              </FadeSlideUp>
            )}

            <StaggerContainer className="space-y-6">
              {comments.map((comment: any) => (
                <StaggerItem key={comment.id}>
                  <SlideFromLeft>
                    <div className="flex gap-4">
                      <Avatar className="h-10 w-10 mt-1">
                        <AvatarFallback>{comment.authorName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted/40 p-4 rounded-2xl rounded-tl-none">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-sm">
                              {comment.authorName}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), {
                                  addSuffix: true,
                                  locale: language === "ro" ? ro : enUS,
                                })}
                              </span>
                              <ReportButton contentType="comment" contentId={comment.id} />
                              {(user?.id === comment.authorId || isAdmin) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteComment.mutate(comment.id)}
                                  disabled={deleteComment.isPending}
                                  data-testid={`btn-delete-comment-${comment.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                          <div className="mt-2 -ml-2">
                            <ReactionButtons contentType="comment" contentId={comment.id} size="sm" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </SlideFromLeft>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </section>
        </div>
      </div>
    </Layout>
  );
}
