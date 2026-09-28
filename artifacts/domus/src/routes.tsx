import { Switch, Route, Redirect } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Overview as OverviewPage,
  Demands as DemandsPage,
  Finance as FinancialPage,
  Clients,
} from "@/pages/legal-workspace";
import { Cases as ProjectsPage } from "@/pages/cases";
import Onboarding from "@/pages/onboarding";
import { useWorkspace } from "@/data/store";
import DomusAIPage from "@/pages/domus-ai";
import AccountPage from "@/pages/account";
import NotFound from "@/pages/not-found";

function AppRoutes() {
  const { state } = useWorkspace();
  return (
    <AppLayout>
      <Switch>
        <Route path="/configuracao" component={Onboarding} />
        <Route path="/conta" component={AccountPage} />
        {!state.company.onboarded && (
          <Route>
            <Onboarding />
          </Route>
        )}
        <Route path="/clientes" component={Clients} />
        <Route path="/" component={OverviewPage} />
        <Route path="/demandas" component={DemandsPage} />
        <Route path="/projetos" component={ProjectsPage} />
        <Route path="/financeiro" component={FinancialPage} />
        <Route path="/domus-ai" component={DomusAIPage} />
        {/* Legacy redirect */}
        <Route path="/chat" component={() => <Redirect to="/domus-ai" />} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default AppRoutes;
