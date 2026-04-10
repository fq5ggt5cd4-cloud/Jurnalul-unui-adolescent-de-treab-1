import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useLocation, useSearch, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Loader2, FileText, CheckCircle, Lock, School, Palette, Lightbulb, BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function EditorPage() {
  const { t } = useLang();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedCategory = params.get("category") || "";
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;
  const postId = editId ? parseInt(editId) : 0;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(preselectedCategory || "liceu");
  const [published, setPublished] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: existingPost, isLoading: postLoading } = useQuery<any>({
    queryKey: ["/api/posts", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isEditMode && !isNaN(postId),
  });

  useEffect(() => {
    if (isEditMode && existingPost && !initialized) {
      setTitle(existingPost.title || "");
      setContent(existingPost.content || "");
      setCategory(existingPost.category || "liceu");
      setInitialized(true);
    }
  }, [existingPost, isEditMode, initialized]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/auth");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (!authLoading && isAuthenticated && !isAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <Lock className="w-14 h-14 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold mb-2 text-foreground">
            {t('editor.forbidden.title')}
          </h2>
          <p className="text-muted-foreground mb-6">
            {t('editor.forbidden.desc')}
          </p>
          <Link href="/">
            <Button>{t("btn.back")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const publishPost = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      category: string;
    }) => {
      if (isEditMode) {
        const res = await apiRequest("PUT", `/api/posts/${postId}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/posts", data);
        return res.json();
      }
    },
    onSuccess: (post: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.id || postId] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts", post.category] });
      setPublished(true);
      setTimeout(() => {
        setLocation(`/article/${post.id || postId}`);
      }, 1500);
    },
  });

  const handlePublish = () => {
    if (!title.trim() || !content.trim()) return;
    publishPost.mutate({ title, content, category });
  };

  if (authLoading || (isEditMode && postLoading)) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (isEditMode && !postLoading && !existingPost) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl font-bold mb-2 text-foreground">{t('notfound.title')}</h2>
          <Link href="/">
            <Button className="mt-4">{t("btn.back")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (published) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-2">
            {isEditMode ? t('editor.updated') : t('editor.published')}
          </h2>
          <p className="text-muted-foreground">
            {t('editor.redirect')}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href={isEditMode ? `/article/${postId}` : "/"}>
          <Button
            variant="ghost"
            className="mb-6 pl-0 hover:bg-transparent hover:text-primary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('btn.back')}
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" />
          <h1 className="text-2xl sm:text-3xl font-bold">
            {isEditMode ? t('editor.title.edit') : t('editor.title')}
          </h1>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("create.post.title")}
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('editor.title.placeholder')}
              className="text-lg h-12"
              data-testid="input-editor-title"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">{t('editor.section')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full max-w-xs" data-testid="select-editor-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liceu">
                  <span className="inline-flex items-center gap-2"><School className="w-4 h-4 text-primary" strokeWidth={1.5} /> {t("category.liceu")}</span>
                </SelectItem>
                <SelectItem value="hobby">
                  <span className="inline-flex items-center gap-2"><Palette className="w-4 h-4 text-primary" strokeWidth={1.5} /> {t("category.hobby")}</span>
                </SelectItem>
                <SelectItem value="sfaturi">
                  <span className="inline-flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" strokeWidth={1.5} /> {t("category.sfaturi")}</span>
                </SelectItem>
                <SelectItem value="general">
                  <span className="inline-flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" strokeWidth={1.5} /> {t("category.general")}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t("create.post.content")}
            </Label>
            <RichEditor
              content={content}
              onChange={setContent}
              placeholder={t('editor.content.placeholder')}
            />
          </div>

          {publishPost.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium">
                {(publishPost.error as Error).message}
              </p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setLocation(isEditMode ? `/article/${postId}` : "/")}
              className="px-8"
            >
              {t('btn.cancel')}
            </Button>
            <Button
              onClick={handlePublish}
              disabled={
                !title.trim() || !content.trim() || publishPost.isPending
              }
              className="px-8 text-lg shadow-lg"
              data-testid="btn-publish-article"
            >
              {publishPost.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditMode ? t("btn.update") : t("create.post.submit")}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
