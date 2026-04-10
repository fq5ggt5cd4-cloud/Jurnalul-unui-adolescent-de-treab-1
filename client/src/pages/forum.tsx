import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { MessageCircle, PlusCircle, Loader2, MessagesSquare, BookOpen, Gamepad2, Music, Monitor, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { FadeSlideUp, StaggerContainer, StaggerItem } from "@/components/animations";
import { ReportButton } from "@/components/report-button";
import { useTranslatedText } from "@/hooks/use-translate";
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

const FORUM_CATEGORY_ICONS: Record<string, React.FC<any>> = {
  general: MessagesSquare,
  school: BookOpen,
  gaming: Gamepad2,
  music: Music,
  tech: Monitor,
};

const FORUM_CATEGORY_IDS = [
  { id: "general", nameKey: "forum.general", descKey: "forum.general.desc" },
  { id: "school", nameKey: "forum.school", descKey: "forum.school.desc" },
  { id: "gaming", nameKey: "forum.gaming", descKey: "forum.gaming.desc" },
  { id: "music", nameKey: "forum.music", descKey: "forum.music.desc" },
  { id: "tech", nameKey: "forum.tech", descKey: "forum.tech.desc" },
];

function TopicTitle({ title }: { title: string }) {
  const translated = useTranslatedText(title);
  return <>{translated}</>;
}

export default function ForumPage() {
  const { t, language } = useLang();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("general");
  const isAdmin = user?.role === "admin";

  const FORUM_CATEGORIES = FORUM_CATEGORY_IDS.map((cat) => ({
    ...cat,
    name: t(cat.nameKey as any),
    desc: t(cat.descKey as any),
  }));

  const { data: topics = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/forum/topics", selectedCategory],
    queryFn: async () => {
      const url = selectedCategory
        ? `/api/forum/topics?categoryId=${selectedCategory}`
        : "/api/forum/topics";
      const res = await fetch(url);
      return res.json();
    },
  });

  const createTopic = useMutation({
    mutationFn: async (data: { title: string; categoryId: string }) => {
      const res = await apiRequest("POST", "/api/forum/topics", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/topics"] });
      setIsCreateOpen(false);
      setNewTitle("");
    },
  });

  const deleteTopic = useMutation({
    mutationFn: async (topicId: number) => {
      await apiRequest("DELETE", `/api/forum/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forum/topics"] });
    },
  });

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    createTopic.mutate({ title: newTitle, categoryId: newCategoryId });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <FadeSlideUp>
          <div className="text-center mb-12">
            <h1 className="text-4xl font-hand font-bold text-primary mb-4">
              {t("nav.forum")}
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t('forum.subtitle')}
            </p>
          </div>
        </FadeSlideUp>

        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="rounded-full transition-all duration-200 hover:scale-105"
            onClick={() => setSelectedCategory(null)}
          >
            {t('forum.all')}
          </Button>
          {FORUM_CATEGORIES.map((cat) => {
            const CatIcon = FORUM_CATEGORY_ICONS[cat.id] || MessagesSquare;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="rounded-full transition-all duration-200 hover:scale-105 gap-1.5"
                onClick={() => setSelectedCategory(cat.id)}
              >
                <CatIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> {cat.name}
              </Button>
            );
          })}
        </div>

        <div className="flex justify-end mb-8">
          {isAuthenticated ? (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 transition-all duration-200 hover:scale-105" data-testid="btn-create-topic">
                  <PlusCircle className="w-4 h-4" />
                  {t('forum.new.thread')}
                </Button>
              </DialogTrigger>
              <DialogContent aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>{t('forum.new.topic')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTopic} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>{t('forum.topic.title')}</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={t('forum.topic.title.placeholder')}
                      required
                      data-testid="input-topic-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('forum.category')}</Label>
                    <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORUM_CATEGORIES.map((cat) => {
                          const CatIcon = FORUM_CATEGORY_ICONS[cat.id] || MessagesSquare;
                          return (
                            <SelectItem key={cat.id} value={cat.id}>
                              <span className="inline-flex items-center gap-2"><CatIcon className="w-4 h-4" strokeWidth={1.5} /> {cat.name}</span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createTopic.isPending}>
                    {createTopic.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('forum.create.topic')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : (
            <Link href="/auth">
              <Button variant="outline" className="transition-all duration-200 hover:scale-105">{t('forum.login.post')}</Button>
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground italic border-2 border-dashed rounded-3xl">
            {t('forum.no.topics')}
          </div>
        ) : (
          <StaggerContainer className="space-y-4">
            {topics.map((topic: any) => {
              const canDelete = user && (user.id === topic.authorId || isAdmin);
              return (
              <StaggerItem key={topic.id}>
                <Card className="hover:border-primary/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <Link href={`/forum/${topic.id}`} className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg break-words cursor-pointer hover:text-primary transition-colors"><TopicTitle title={topic.title} /></CardTitle>
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-xs gap-1">
                          {(() => { const Icon = FORUM_CATEGORY_ICONS[topic.categoryId] || MessagesSquare; return <Icon className="w-3 h-3" strokeWidth={1.5} />; })()}
                          {FORUM_CATEGORIES.find((c) => c.id === topic.categoryId)?.name || topic.categoryId}
                        </Badge>
                        <ReportButton contentType="forum_topic" contentId={topic.id} />
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                data-testid={`btn-delete-topic-${topic.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-3 h-3" />
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
                                  onClick={() => deleteTopic.mutate(topic.id)}
                                >
                                  {t("btn.delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <Link href={`/forum/${topic.id}`}>
                    <CardContent className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:justify-between gap-1 cursor-pointer">
                      <span>{t('archive.by')} {topic.authorName}</span>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" /> {topic.replyCount} {t('forum.replies')}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(topic.createdAt), {
                            addSuffix: true,
                            locale: language === "ro" ? ro : enUS,
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}
