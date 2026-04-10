import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PenSquare, Loader2 } from "lucide-react";
import { FadeSlideUp, ScaleIn } from "@/components/animations";
import { CategoryIcon } from "@/components/category-icon";
import { ArticleCarousel } from "@/components/article-carousel";

export default function SectionPage() {
  const { t, language } = useLang();
  const { category } = useParams<{ category: string }>();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const { data: posts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts", category],
    queryFn: async () => {
      const res = await fetch(`/api/posts?category=${category}`);
      return res.json();
    },
  });

  return (
    <Layout>
      <FadeSlideUp>
        <div className="bg-primary/5 py-12 border-b">
          <div className="container mx-auto px-4 text-center">
            <ScaleIn>
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CategoryIcon category={category || "general"} className="w-9 h-9 text-primary" strokeWidth={1.5} />
              </div>
            </ScaleIn>
            <h1 className="text-4xl font-hand font-bold text-primary mb-2">
              {t(`category.${category}`)}
            </h1>
          </div>
        </div>
      </FadeSlideUp>

      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex justify-end mb-8">
          {isAdmin && (
            <Button
              className="gap-2 shadow-lg"
              onClick={() => setLocation(`/editor?category=${category}`)}
              data-testid="btn-create-post"
            >
              <PenSquare className="w-4 h-4" />
              {t("create.post.submit")}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <FadeSlideUp delay={0.1}>
            <div className="text-center py-20 border-2 border-dashed rounded-3xl">
              <h3 className="text-xl font-bold text-muted-foreground mb-2">
                {t("no.posts")}
              </h3>
            </div>
          </FadeSlideUp>
        ) : (
          <FadeSlideUp delay={0.1}>
            <ArticleCarousel posts={posts} visibleCount={4} />
          </FadeSlideUp>
        )}
      </div>
    </Layout>
  );
}
