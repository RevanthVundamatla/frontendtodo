import { Switch, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./lib/auth-context";
import { AuthPage } from "./pages/auth";
import { WorkspacePage } from "./pages/workspace";
import { OAuthSuccessPage } from "./pages/oauth-success";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/oauth-success" component={OAuthSuccessPage} />
      <Route path="/" component={WorkspacePage} />
      <Route>
        <div className="flex min-h-screen items-center justify-center text-emerald-900">Page not found</div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </QueryClientProvider>
  );
}
