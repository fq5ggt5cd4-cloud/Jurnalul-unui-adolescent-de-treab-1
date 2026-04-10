import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { HelpCircle, Send, Loader2, Trash2, CheckCircle2, Clock, ShieldCheck, XCircle, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportButton } from "@/components/report-button";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { FadeSlideUp, AnimatedList, AnimatedListItem, ScaleIn } from "@/components/animations";

export default function QAPage() {
  const { t, language } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [adminAnswer, setAdminAnswer] = useState("");
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQaId, setDeletingQaId] = useState<number | null>(null);

  const { data: qas = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/qa"],
    queryFn: async () => {
      const res = await fetch("/api/qa");
      return res.json();
    },
  });

  const submitQuestion = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/qa", {
        question: q,
        authorName: user ? user.username : t('qa.anonymous') as string,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      setQuestion("");
      toast({ title: t('qa.waiting.approval') as string });
    },
  });

  const approveQuestion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/qa/${id}/approve`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      toast({ title: t('qa.approve.success') as string });
    },
  });

  const rejectQuestion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/qa/${id}/reject`);
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      toast({ title: t('qa.reject.success') as string });
    },
  });

  const withdrawQuestion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/qa/${id}`);
      if (!res.ok) throw new Error("Failed to withdraw");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      toast({ title: t('qa.withdraw.success') as string });
    },
  });

  const answerQuestion = useMutation({
    mutationFn: async ({ id, answer }: { id: number; answer: string }) => {
      const res = await apiRequest("PUT", `/api/qa/${id}/answer`, { answer });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      setAnsweringId(null);
      setAdminAnswer("");
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/qa/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to delete question");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qa"] });
      toast({
        title: t('qa.delete.success') as string,
      });
    },
    onError: (error: Error) => {
      const isForbidden = error.message.includes("only delete your own");
      toast({
        title: isForbidden ? (t('qa.delete.forbidden') as string) : error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    submitQuestion.mutate(question);
  };

  const handleDeleteClick = (qaId: number) => {
    setDeletingQaId(qaId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deletingQaId !== null) {
      deleteQuestion.mutate(deletingQaId);
    }
    setDeleteDialogOpen(false);
    setDeletingQaId(null);
  };

  const canDelete = (qa: any) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return qa.authorId === user.id;
  };

  return (
    <Layout>
      <FadeSlideUp>
        <div className="bg-accent/5 py-12 border-b">
          <div className="container mx-auto px-4 text-center">
            <ScaleIn>
              <div className="w-16 h-16 bg-accent text-accent-foreground rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
                <HelpCircle className="w-8 h-8" strokeWidth={1.5} />
              </div>
            </ScaleIn>
            <h1 className="text-4xl font-hand font-bold text-accent mb-4">
              {t("nav.qa")}
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('qa.subtitle')}
            </p>
          </div>
        </div>
      </FadeSlideUp>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <FadeSlideUp delay={0.1}>
          {user ? (
            <Card className="mb-12 border-2 border-accent/20 shadow-xl">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={t('qa.placeholder')}
                    className="flex-1"
                    data-testid="input-question"
                  />
                  <Button
                    type="submit"
                    className="bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-200 hover:scale-105"
                    disabled={submitQuestion.isPending}
                    data-testid="btn-submit-question"
                  >
                    {submitQuestion.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    {t('qa.ask')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-12 border-2 border-accent/20 shadow-xl">
              <CardContent className="pt-6 pb-6 text-center">
                <p className="text-muted-foreground mb-4">{t('qa.login.required')}</p>
                <a href="/auth">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                    {t('nav.login')}
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}
        </FadeSlideUp>

        <FadeSlideUp delay={0.15}>
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-6">
            <HelpCircle className="text-muted-foreground" />
            {t('qa.recent')}
          </h3>
        </FadeSlideUp>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : qas.length === 0 ? (
          <FadeSlideUp delay={0.2}>
            <div className="text-center py-12 text-muted-foreground italic">
              {t('qa.no.questions')}
            </div>
          </FadeSlideUp>
        ) : (
          <AnimatedList className="space-y-6">
            {qas.map((qa: any) => (
              <AnimatedListItem key={qa.id} itemKey={qa.id}>
                <Card
                  className={`overflow-hidden transition-all duration-200 hover:shadow-md ${
                    qa.isAnswered
                      ? "border-l-4 border-l-green-500"
                      : "border-l-4 border-l-yellow-500"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base sm:text-lg mb-1 break-words">{qa.question}</p>
                        {!qa.isApproved && (user?.role === "admin" || qa.authorId === user?.id) && (
                          <Badge variant="outline" className="text-[11px] border-amber-400 text-amber-600 dark:text-amber-400 gap-1">
                            <Clock className="w-3 h-3" />
                            {t('qa.status.waiting')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 shrink-0">
                        {user?.role === "admin" && !qa.isApproved && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-500 hover:bg-green-50 dark:hover:bg-green-950 gap-1"
                              onClick={() => approveQuestion.mutate(qa.id)}
                              disabled={approveQuestion.isPending}
                              data-testid={`btn-approve-qa-${qa.id}`}
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {t('qa.approve')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive border-destructive/50 hover:bg-destructive/10 gap-1"
                              onClick={() => rejectQuestion.mutate(qa.id)}
                              disabled={rejectQuestion.isPending}
                              data-testid={`btn-reject-qa-${qa.id}`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {t('qa.reject')}
                            </Button>
                          </>
                        )}
                        {user && user.role !== "admin" && qa.authorId === user.id && !qa.isApproved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => withdrawQuestion.mutate(qa.id)}
                            disabled={withdrawQuestion.isPending}
                            data-testid={`btn-withdraw-qa-${qa.id}`}
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            {t('qa.withdraw')}
                          </Button>
                        )}
                        <ReportButton contentType="qa" contentId={qa.id} />
                        {canDelete(qa) && qa.isApproved && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteClick(qa.id)}
                            disabled={deleteQuestion.isPending}
                            data-testid={`btn-delete-qa-${qa.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t('qa.delete')}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 text-xs text-muted-foreground mb-4">
                      <span>
                        {t('qa.asked.by')} {qa.authorName} •{" "}
                        {formatDistanceToNow(new Date(qa.createdAt), {
                          addSuffix: true,
                          locale: language === "ro" ? ro : enUS,
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        {qa.isAnswered ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" strokeWidth={2} /> {t('qa.answered')}</> : <><Clock className="w-3.5 h-3.5 text-yellow-500" strokeWidth={2} /> {t('qa.pending')}</>}
                      </span>
                    </div>

                    {qa.isAnswered && (
                      <div className="bg-muted/30 p-4 rounded-lg mt-4 border-l-2 border-primary">
                        <p className="text-sm font-semibold text-primary mb-1">
                          {t('qa.answer.label')}
                        </p>
                        <p className="text-sm">{qa.answer}</p>
                      </div>
                    )}

                    {user?.role === "admin" && !qa.isAnswered && (
                      <div className="mt-4 pt-4 border-t">
                        {answeringId === qa.id ? (
                          <div className="flex gap-2">
                            <Input
                              value={adminAnswer}
                              onChange={(e) => setAdminAnswer(e.target.value)}
                              placeholder={t('qa.admin.answer')}
                            />
                            <Button
                              size="sm"
                              onClick={() =>
                                answerQuestion.mutate({
                                  id: qa.id,
                                  answer: adminAnswer,
                                })
                              }
                              disabled={answerQuestion.isPending}
                            >
                              {t('qa.admin.submit')}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAnsweringId(null)}
                            >
                              {t('qa.admin.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAnsweringId(qa.id)}
                            data-testid={`btn-answer-qa-${qa.id}`}
                          >
                            {t('qa.admin.btn')}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('qa.delete.confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('qa.delete.confirm.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete-qa">
              {t('qa.delete.confirm.no')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="btn-confirm-delete-qa"
            >
              {t('qa.delete.confirm.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
