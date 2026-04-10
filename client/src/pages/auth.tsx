import { Layout } from "@/components/layout";
import { useLang } from "@/lib/lang";
import { useAuth, useAuthProviders } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Loader2 } from "lucide-react";
import { ScaleIn } from "@/components/animations";

export default function AuthPage() {
  const { t } = useLang();
  const { login, register, isAuthenticated } = useAuth();
  const { data: providers } = useAuthProviders();
  const [, setLocation] = useLocation();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register.mutate({
      username: regUsername,
      email: regEmail,
      password: regPassword,
      acceptedTerms,
    });
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto py-20 px-4">
        <ScaleIn>
          <Card className="border-2 border-primary/10 shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-hand text-primary">
                {t("hero.title")}
              </CardTitle>
              <CardDescription>{t('auth.join')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="login" data-testid="tab-login">
                    {t("auth.login.title")}
                  </TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">
                    {t("auth.register.title")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">{t('auth.email')}</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="email@example.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">{t('auth.password')}</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        data-testid="input-login-password"
                      />
                    </div>

                    {login.error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p
                          className="text-sm text-destructive font-medium"
                          data-testid="text-login-error"
                        >
                          {(login.error as Error).message}
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full text-lg"
                      disabled={login.isPending}
                      data-testid="btn-login-submit"
                    >
                      {login.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("nav.login")}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-username">{t('auth.username')}</Label>
                      <Input
                        id="reg-username"
                        placeholder="CoolTeen123"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        required
                        data-testid="input-reg-username"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">{t('auth.email')}</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="email@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        required
                        data-testid="input-reg-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">{t('auth.password')}</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder={t('auth.password.min')}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        required
                        minLength={6}
                        data-testid="input-reg-password"
                      />
                    </div>

                    <div className="flex items-start space-x-3 pt-2">
                      <Checkbox
                        id="accept-terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) =>
                          setAcceptedTerms(checked === true)
                        }
                        data-testid="checkbox-accept-terms"
                      />
                      <label
                        htmlFor="accept-terms"
                        className="text-sm leading-tight cursor-pointer"
                      >
                        {t('auth.accept.terms')}{" "}
                        <Link href="/terms">
                          <span className="text-primary underline font-medium">
                            {t('auth.terms.link')}
                          </span>
                        </Link>{" "}
                        {t('auth.and')}{" "}
                        <Link href="/privacy">
                          <span className="text-primary underline font-medium">
                            {t('auth.privacy.link')}
                          </span>
                        </Link>
                      </label>
                    </div>

                    {register.error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p
                          className="text-sm text-destructive font-medium"
                          data-testid="text-register-error"
                        >
                          {(register.error as Error).message}
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      disabled={register.isPending || !acceptedTerms}
                      data-testid="btn-register-submit"
                    >
                      {register.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {t("auth.register.title")}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {providers?.google && (
                <>
                  <Separator className="my-6" />
                  <a href="/api/auth/google">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      data-testid="btn-google-login"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      {t('auth.google')}
                    </Button>
                  </a>
                </>
              )}
            </CardContent>
          </Card>
        </ScaleIn>
      </div>
    </Layout>
  );
}
