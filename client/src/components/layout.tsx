import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLang, LANGUAGES, type Language } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Menu, Globe, PenSquare, Moon, Sun, User as UserIcon, Shield, LayoutDashboard, Bell, MessageSquare, HelpCircle, Flag, CheckCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";

function FlagIcon({ code, size = "sm" }: { code: string; size?: "sm" | "md" }) {
  const px = size === "md" ? 20 : 16;
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-[3px]" style={{ width: px, height: Math.round(px * 0.75) }}>
      <img
        src={`https://flagcdn.com/w${px * 2}/${code}.png`}
        alt=""
        className="w-full h-full object-cover"
        loading="eager"
      />
    </span>
  );
}

const NOTIF_ICONS: Record<string, React.FC<any>> = {
  new_forum_topic: MessageSquare,
  new_qa: HelpCircle,
  new_report: Flag,
};

// Map our language codes to Google Translate codes
const GT_LANG: Record<string, string> = { zh: 'zh-CN', ro: '' };

function setGTCookie(gtCode: string) {
  const val = gtCode ? `/ro/${gtCode}` : '';
  const maxAge = gtCode ? 31536000 : -1;
  document.cookie = `googtrans=${val}; path=/; max-age=${maxAge}`;
  try {
    document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname}; max-age=${maxAge}`;
  } catch {}
}

function applyGoogleTranslate(langCode: string) {
  const gtCode = GT_LANG[langCode] ?? langCode;
  setGTCookie(gtCode);

  if (!gtCode) {
    // Restoring to Romanian (original language): clear cookie then reload
    // so the page loads without any GT translation active
    window.location.reload();
    return;
  }

  const trySet = (attempts = 0) => {
    const combo = document.querySelector('select.goog-te-combo') as HTMLSelectElement | null;
    if (combo) {
      combo.value = gtCode;
      combo.dispatchEvent(new Event('change'));
    } else if (attempts < 40) {
      setTimeout(() => trySet(attempts + 1), 150);
    }
  };
  trySet();
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, language, setLanguage } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  const isAdmin = user?.role === "admin";

  // On mount: if a non-Romanian language is persisted, activate GT translation
  useEffect(() => {
    if (language !== 'ro') {
      applyGoogleTranslate(language);
    }
  }, []);

  // Re-apply GT after SPA navigation so newly rendered React content gets translated
  useEffect(() => {
    if (language !== 'ro') {
      setTimeout(() => applyGoogleTranslate(language), 350);
    }
  }, [location]);

  const baseNavItems = [
    { label: t("nav.home"), href: "/" },
    { label: t("nav.life"), href: "/section/liceu" },
    { label: t("nav.hobbies"), href: "/section/hobby" },
    { label: t("nav.advice"), href: "/section/sfaturi" },
    { label: t("nav.forum"), href: "/forum" },
    { label: t("nav.qa"), href: "/qa" },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { label: t("nav.archive"), href: "/archive" }]
    : baseNavItems;

  const currentLang = LANGUAGES.find((l) => l.code === language);

  const { data: unreadData } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    enabled: isAdmin,
    refetchInterval: 20000,
  });

  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isAdmin,
    refetchInterval: 20000,
  });

  const markAllRead = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/notifications/read-all"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const unreadCount = unreadData?.count ?? 0;

  const handleNotifClick = (notif: any) => {
    if (!notif.isRead) markOneRead.mutate(notif.id);
    if (notif.type === "new_forum_topic" && notif.contentId) {
      setLocation(`/forum/${notif.contentId}`);
    } else if (notif.type === "new_qa") {
      setLocation("/qa");
    } else if (notif.type === "new_report") {
      setLocation("/admin");
    }
  };

  const NotificationBell = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" data-testid="btn-notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 font-semibold">{t("nav.notifications")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-muted-foreground"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3" />
              {t("nav.notif.markall")}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">{t("nav.notif.empty")}</div>
          ) : (
            notifications.slice(0, 20).map((notif: any) => {
              const Icon = NOTIF_ICONS[notif.type] ?? Bell;
              return (
                <DropdownMenuItem
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${!notif.isRead ? "bg-primary/5 font-medium" : ""}`}
                  onClick={() => handleNotifClick(notif)}
                  data-testid={`notif-item-${notif.id}`}
                >
                  <div className={`mt-0.5 shrink-0 p-1.5 rounded-full ${!notif.isRead ? "bg-primary/10" : "bg-muted"}`}>
                    <Icon className={`w-3 h-3 ${!notif.isRead ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug break-words">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(notif.createdAt), {
                        addSuffix: true,
                        locale: language === "ro" ? ro : enUS,
                      })}
                    </p>
                  </div>
                  {!notif.isRead && <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary" />}
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background transition-colors duration-300">
      <header translate="no" className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <span className="font-hand text-2xl font-bold text-primary tracking-tight hover:opacity-80 transition-opacity cursor-pointer">
              Jurnalul
              <span className="text-secondary">.</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center space-x-5">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={`text-sm font-medium transition-all hover:text-primary cursor-pointer relative group ${
                    location === item.href
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.label}
                  <span className={`absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${location === item.href ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                </span>
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center space-x-2">
            {isAuthenticated && isAdmin && (
              <Button
                size="sm"
                className="gap-2 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                onClick={() => setLocation("/editor")}
                data-testid="btn-write-article"
              >
                <PenSquare className="w-4 h-4" />
                {t("btn.create")}
              </Button>
            )}

            {isAdmin && <NotificationBell />}

            <button
              className="theme-toggle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              data-theme={theme}
              onClick={toggleTheme}
              data-testid="btn-toggle-theme"
              aria-label={theme === 'dark' ? t('nav.lightmode') : t('nav.darkmode')}
            >
              <span className="theme-toggle-knob">
                {theme === 'dark' ? <Moon className="h-3 w-3 text-purple-300" /> : <Sun className="h-3.5 w-3.5 text-yellow-500" />}
              </span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 rounded-full" data-testid="btn-language-selector">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80" translate="no">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t('nav.language')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-64">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); applyGoogleTranslate(lang.code); }}
                      className={`gap-2 cursor-pointer ${language === lang.code ? 'bg-primary/10 text-primary font-bold' : ''}`}
                    >
                      <FlagIcon code={lang.flag} size="md" />
                      <span className="text-sm notranslate">{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                    data-testid="btn-user-menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar || undefined}
                        alt={user.username}
                      />
                      <AvatarFallback>
                        {user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="font-bold gap-2">
                    {user.username}
                    {isAdmin && (
                      <Badge variant="default" className="text-[10px] py-0 px-1 gap-0.5">
                        <Shield className="w-3 h-3" />
                        Admin
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setLocation(`/profile/${user.username}`)}
                    data-testid="btn-profile"
                  >
                    <UserIcon className="w-4 h-4 mr-2" />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={() => setLocation("/admin")}
                      data-testid="btn-admin-dashboard"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t("nav.admin")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => logout.mutate()}
                    data-testid="btn-logout"
                  >
                    {t("nav.logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6 hover:shadow-lg transition-all hover:-translate-y-0.5"
                onClick={() => setLocation("/auth")}
                data-testid="btn-login"
              >
                {t("nav.login")}
              </Button>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-1">
            <button
              className="theme-toggle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              data-theme={theme}
              onClick={toggleTheme}
              data-testid="btn-toggle-theme-mobile"
              aria-label={theme === 'dark' ? t('nav.lightmode') : t('nav.darkmode')}
            >
              <span className="theme-toggle-knob">
                {theme === 'dark' ? <Moon className="h-3 w-3 text-purple-300" /> : <Sun className="h-3.5 w-3.5 text-yellow-500" />}
              </span>
            </button>

            {isAdmin && <NotificationBell />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80" translate="no">
                <ScrollArea className="h-64">
                  {LANGUAGES.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); applyGoogleTranslate(lang.code); }}
                      className={`gap-2 cursor-pointer ${language === lang.code ? 'bg-primary/10 text-primary font-bold' : ''}`}
                    >
                      <FlagIcon code={lang.flag} size="md" />
                      <span className="text-sm notranslate">{lang.name}</span>
                    </DropdownMenuItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 mt-8">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <span
                        className={`text-lg font-medium cursor-pointer transition-colors ${
                          location === item.href
                            ? "text-primary"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  ))}

                  {isAuthenticated && isAdmin && (
                    <Button
                      className="gap-2 w-full"
                      onClick={() => setLocation("/editor")}
                    >
                      <PenSquare className="w-4 h-4" />
                      {t("btn.create")}
                    </Button>
                  )}

                  <div className="pt-4 border-t">
                    {isAuthenticated && user ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar || undefined} />
                            <AvatarFallback>
                              {user.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-bold">{user.username}</span>
                          {isAdmin && (
                            <Badge variant="default" className="text-[10px] py-0 px-1 gap-0.5">
                              <Shield className="w-3 h-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setLocation(`/profile/${user.username}`)}
                        >
                          <UserIcon className="w-4 h-4 mr-2" />
                          {t("nav.profile")}
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLocation("/admin")}
                          >
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            {t("nav.admin")}
                          </Button>
                        )}
                        <Button
                          onClick={() => logout.mutate()}
                          variant="outline"
                        >
                          {t("nav.logout")}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => setLocation("/auth")}
                      >
                        {t("nav.login")}
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer translate="no" className="border-t bg-card py-8 mt-12 transition-colors duration-300">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p className="font-hand text-lg mb-2 text-primary">
            {t('hero.title')}
          </p>
          <div className="flex justify-center gap-6 mb-3">
            <Link href="/privacy">
              <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-privacy">
                {t('footer.privacy')}
              </span>
            </Link>
            <Link href="/terms">
              <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-terms">
                {t('footer.terms')}
              </span>
            </Link>
          </div>
          <p>&copy; {new Date().getFullYear()} {t('footer.rights')}</p>
        </div>
      </footer>
    </div>
  );
}
