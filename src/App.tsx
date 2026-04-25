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
      {/* Auth routes */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />

      {/* OAuth callback route */}
      <Route path="/oauth-success" component={OAuthSuccessPage} />

      {/* Main app */}
      <Route path="/" component={WorkspacePage} />

      {/* Fallback route */}
      <Route>
        <div className="flex min-h-screen items-center justify-center text-emerald-900">
          Page not found
        </div>
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
