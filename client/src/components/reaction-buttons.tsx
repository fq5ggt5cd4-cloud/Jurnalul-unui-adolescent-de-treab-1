import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ReactionButtonsProps {
  contentType: "post" | "comment" | "forum_reply";
  contentId: number;
  size?: "sm" | "default";
}

export function ReactionButtons({ contentType, contentId, size = "default" }: ReactionButtonsProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const { data } = useQuery<{ likes: number; dislikes: number; userReaction: string | null }>({
    queryKey: ["reactions", contentType, contentId],
    queryFn: async () => {
      const res = await fetch(`/api/reactions/${contentType}/${contentId}`);
      return res.json();
    },
  });

  const react = useMutation({
    mutationFn: async (type: "like" | "dislike") => {
      const res = await apiRequest("POST", "/api/reactions", { contentType, contentId, type });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["reactions", contentType, contentId], {
        likes: result.likes,
        dislikes: result.dislikes,
        userReaction: result.userReaction,
      });
    },
  });

  const handleReact = (type: "like" | "dislike") => {
    if (!isAuthenticated) {
      setLocation("/auth");
      return;
    }
    react.mutate(type);
  };

  const likes = data?.likes ?? 0;
  const dislikes = data?.dislikes ?? 0;
  const userReaction = data?.userReaction ?? null;
  const isSmall = size === "sm";

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1 rounded-full transition-colors ${isSmall ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"} ${
          userReaction === "like"
            ? "text-primary bg-primary/10 hover:bg-primary/15"
            : "text-muted-foreground hover:text-primary hover:bg-primary/5"
        }`}
        onClick={() => handleReact("like")}
        disabled={react.isPending}
        data-testid={`btn-like-${contentType}-${contentId}`}
      >
        <ThumbsUp className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {likes > 0 && <span>{likes}</span>}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`gap-1 rounded-full transition-colors ${isSmall ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"} ${
          userReaction === "dislike"
            ? "text-destructive bg-destructive/10 hover:bg-destructive/15"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        }`}
        onClick={() => handleReact("dislike")}
        disabled={react.isPending}
        data-testid={`btn-dislike-${contentType}-${contentId}`}
      >
        <ThumbsDown className={isSmall ? "w-3 h-3" : "w-3.5 h-3.5"} />
        {dislikes > 0 && <span>{dislikes}</span>}
      </Button>
    </div>
  );
}
