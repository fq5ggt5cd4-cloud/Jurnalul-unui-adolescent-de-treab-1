import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, ChevronDown, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "wouter";
import { useLang } from "@/lib/lang";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface ArticleCarouselProps {
  posts: any[];
  visibleCount?: number;
  autoScrollInterval?: number;
}

export function ArticleCarousel({ posts, visibleCount = 3, autoScrollInterval = 4000 }: ArticleCarouselProps) {
  const { t, language } = useLang();
  const [startIndex, setStartIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const maxIndex = Math.max(0, posts.length - visibleCount);
  const canGoUp = startIndex > 0;
  const canGoDown = startIndex < maxIndex;

  const goUp = useCallback(() => {
    setDirection(-1);
    setStartIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goDown = useCallback(() => {
    setDirection(1);
    setStartIndex((prev) => {
      if (prev >= maxIndex) return 0;
      return prev + 1;
    });
  }, [maxIndex]);

  useEffect(() => {
    if (isPaused || posts.length <= visibleCount) return;

    intervalRef.current = setInterval(() => {
      setDirection(1);
      setStartIndex((prev) => {
        if (prev >= maxIndex) return 0;
        return prev + 1;
      });
    }, autoScrollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused, maxIndex, posts.length, visibleCount, autoScrollInterval]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  const visiblePosts = posts.slice(startIndex, startIndex + visibleCount);

  const slideVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 60 : -60,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      y: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      y: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.98,
    }),
  };

  if (posts.length === 0) return null;

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex items-center justify-center mb-6 gap-3">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-10 h-10 shadow-md border-border/60 hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-30"
          onClick={() => { goUp(); setIsPaused(true); }}
          disabled={!canGoUp}
          data-testid="btn-carousel-up"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
        {posts.length > visibleCount && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full w-8 h-8 text-muted-foreground hover:text-primary"
            onClick={() => setIsPaused(!isPaused)}
            data-testid="btn-carousel-pause"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </Button>
        )}
      </div>

      <div className="space-y-5 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {visiblePosts.map((post: any) => (
            <motion.div
              key={post.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                y: { type: "spring", stiffness: 200, damping: 25 },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 },
              }}
              layout
            >
              <Link href={`/article/${post.id}`}>
                <div
                  className="group relative bg-card rounded-2xl border border-border/50 shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-0.5"
                  data-testid={`card-article-${post.id}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-secondary/[0.03] group-hover:from-primary/[0.06] group-hover:to-secondary/[0.06] transition-all duration-300" />

                  <div className="relative flex flex-col sm:flex-row items-stretch">
                    <div className="sm:w-28 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center p-4 sm:p-0 shrink-0">
                      <CategoryIcon category={post.category} className="w-10 h-10 sm:w-8 sm:h-8 text-primary/60 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 p-5 sm:p-6 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="secondary" className="uppercase text-[9px] tracking-wider font-bold bg-secondary/15 text-secondary-foreground">
                          {t(`category.${post.category}`) || post.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                            locale: language === "ro" ? ro : enUS,
                          })}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
                        {post.title}
                      </h3>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {post.content?.replace(/<[^>]*>/g, "").slice(0, 180)}
                      </p>

                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:gap-2.5 transition-all">
                        {t("btn.readmore")}
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center mt-6 gap-3">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full w-10 h-10 shadow-md border-border/60 hover:bg-primary/10 hover:border-primary/40 transition-all disabled:opacity-30"
          onClick={() => { goDown(); setIsPaused(true); }}
          disabled={!canGoDown && posts.length <= visibleCount}
          data-testid="btn-carousel-down"
        >
          <ChevronDown className="w-5 h-5" />
        </Button>
        {posts.length > visibleCount && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {startIndex + 1}–{Math.min(startIndex + visibleCount, posts.length)} / {posts.length}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(posts.length / visibleCount) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    Math.floor(startIndex / visibleCount) === i
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
