import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import heroBanner from "@/assets/hero-banner.png";
import schoolBg from "@/assets/school-hallway-bg.png";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PenSquare, FileEdit } from "lucide-react";
import { FadeSlideUp, ScaleIn } from "@/components/animations";
import { ArticleCarousel } from "@/components/article-carousel";

export default function Home() {
  const { t, language } = useLang();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";

  const { data: latestPosts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts/latest"],
    queryFn: async () => {
      const res = await fetch("/api/posts/latest");
      return res.json();
    },
  });

  return (
    <Layout>
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${schoolBg})` }}
        />
        <div className="absolute inset-0 bg-background/75 dark:bg-background/85 backdrop-blur-[2px]" />

        <div className="relative container mx-auto px-4 py-16 md:py-28 flex flex-col-reverse md:flex-row items-center gap-12">
          <FadeSlideUp className="flex-1 space-y-6 text-center md:text-left z-10">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground font-sans">
              <span className="block text-primary font-hand rotate-[-2deg] mb-2 drop-shadow-sm">
                {t("hero.title")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-lg mx-auto md:mx-0">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {isAdmin && (
                <Button
                  size="lg"
                  className="rounded-full px-8 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 gap-2"
                  onClick={() => setLocation("/editor")}
                  data-testid="btn-hero-write"
                >
                  <PenSquare className="w-5 h-5" />
                  {t("btn.create")}
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 text-lg bg-card/60 backdrop-blur-sm border-border/50"
                onClick={() => setLocation("/section/liceu")}
              >
                {t("btn.readmore")}
              </Button>
            </div>
          </FadeSlideUp>

          <ScaleIn delay={0.15} className="flex-1 w-full max-w-xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-secondary/20 rounded-full blur-3xl opacity-50 transform scale-90"></div>
            <img
              src={heroBanner}
              alt={t('hero.title')}
              className="relative w-full h-auto rounded-3xl shadow-2xl border-4 border-card transform rotate-2 hover:rotate-0 transition-transform duration-500"
            />
          </ScaleIn>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <FadeSlideUp>
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold font-hand text-foreground decoration-secondary decoration-4 underline underline-offset-4">
                {t("latest.articles")}
              </h2>
              <Link href="/archive">
                <Button variant="link" className="text-primary font-bold">
                  {t("nav.archive")} &rarr;
                </Button>
              </Link>
            </div>
          </FadeSlideUp>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !latestPosts || latestPosts.length === 0 ? (
            <FadeSlideUp delay={0.1}>
              <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-muted-foreground/30">
                <FileEdit className="w-14 h-14 text-primary/60 mx-auto mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl font-bold text-muted-foreground">
                  {t("no.posts")}
                </h3>
                {isAdmin && (
                  <>
                    <p className="text-muted-foreground mt-2 mb-6">
                      {t('no.posts.cta')}
                    </p>
                    <Button onClick={() => setLocation("/editor")} className="gap-2">
                      <PenSquare className="w-4 h-4" />
                      {t("btn.create")}
                    </Button>
                  </>
                )}
              </div>
            </FadeSlideUp>
          ) : (
            <FadeSlideUp delay={0.1}>
              <ArticleCarousel posts={latestPosts} visibleCount={3} />
            </FadeSlideUp>
          )}
        </div>
      </section>
    </Layout>
  );
}
