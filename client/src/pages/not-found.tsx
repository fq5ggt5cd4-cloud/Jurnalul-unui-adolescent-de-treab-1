import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  const { t } = useLang();

  return (
    <Layout>
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">{t('notfound.title')}</h1>
            <p className="text-muted-foreground mb-6">
              {t('notfound.text')}
            </p>
            <Link href="/">
              <Button className="transition-all duration-200 hover:scale-105">
                {t('notfound.back')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
