import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, Loader2, Lock } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { FadeSlideUp, StaggerContainer, StaggerItem } from "@/components/animations";
import { useAuth } from "@/hooks/use-auth";

export default function ArchivePage() {
  const { t } = useLang();
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/posts"],
    queryFn: async () => {
      const res = await fetch("/api/posts");
      return res.json();
    },
  });

  const filteredPosts = posts.filter((post: any) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.content.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || post.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ["liceu", "hobby", "sfaturi", "general"];

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">{t("archive.restricted.title")}</h2>
          <p className="text-muted-foreground mb-6">{t("archive.restricted.desc")}</p>
          <Link href="/">
            <Button>{t("btn.back")}</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <FadeSlideUp>
          <h1 className="text-4xl font-hand font-bold mb-8">{t("nav.archive")}</h1>
        </FadeSlideUp>

        <FadeSlideUp delay={0.05}>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('archive.search')}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-archive-search"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={categoryFilter === null ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setCategoryFilter(null)}
              >
                {t('archive.all')}
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setCategoryFilter(cat)}
                >
                  {t(`category.${cat}`)}
                </Button>
              ))}
            </div>
          </div>
        </FadeSlideUp>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <FadeSlideUp delay={0.1}>
            <div className="text-muted-foreground text-center py-12">
              {t('archive.no.results')}
            </div>
          </FadeSlideUp>
        ) : (
          <StaggerContainer className="grid gap-4">
            {filteredPosts.map((post: any) => (
              <StaggerItem key={post.id}>
                <Link href={`/article/${post.id}`}>
                  <Card className="hover:bg-muted/20 transition-colors cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(post.createdAt), "PPP")}
                        </span>
                        <span className="uppercase tracking-wider font-bold text-primary">
                          {t(`category.${post.category}`)}
                        </span>
                        
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}
