import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { PageTransition } from "@/components/animations";
import { AnimatePresence } from "framer-motion";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import SectionPage from "@/pages/section";
import ArticlePage from "@/pages/article";
import ForumPage from "@/pages/forum";
import ForumTopicPage from "@/pages/forum-topic";
import QAPage from "@/pages/qa";
import ArchivePage from "@/pages/archive";
import EditorPage from "@/pages/editor";
import PrivacyPolicy from "@/pages/privacy";
import TermsOfService from "@/pages/terms";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location}>
        <Switch location={location}>
          <Route path="/" component={Home} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/profile/:username" component={ProfilePage} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/section/:category" component={SectionPage} />
          <Route path="/article/:id" component={ArticlePage} />
          <Route path="/forum" component={ForumPage} />
          <Route path="/forum/:id" component={ForumTopicPage} />
          <Route path="/qa" component={QAPage} />
          <Route path="/archive" component={ArchivePage} />
          <Route path="/editor" component={EditorPage} />
          <Route path="/editor/:id" component={EditorPage} />
          <Route path="/privacy" component={PrivacyPolicy} />
          <Route path="/terms" component={TermsOfService} />
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
