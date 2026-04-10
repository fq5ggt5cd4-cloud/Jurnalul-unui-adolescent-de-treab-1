import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLang } from "@/lib/lang";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ReportButtonProps {
  contentType: "post" | "comment" | "forum_topic" | "forum_reply" | "qa";
  contentId: number;
  size?: "sm" | "default";
}

export function ReportButton({ contentType, contentId, size = "sm" }: ReportButtonProps) {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  const report = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/reports", { contentType, contentId, reason });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("report.submitted") as string });
      setOpen(false);
      setReason("");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`text-muted-foreground hover:text-destructive transition-colors ${size === "sm" ? "h-6 w-6" : "h-8 w-8"}`}
          title={t("report.btn") as string}
          data-testid={`btn-report-${contentType}-${contentId}`}
        >
          <Flag className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            {t("report.title")}
          </DialogTitle>
          <DialogDescription>{t("report.desc")}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("report.reason.placeholder") as string}
          className="min-h-[100px]"
          data-testid="input-report-reason"
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("btn.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => report.mutate()}
            disabled={!reason.trim() || report.isPending}
            data-testid="btn-confirm-report"
          >
            {t("report.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
