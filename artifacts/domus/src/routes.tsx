import { Switch, Route, Redirect } from "wouter"
import { AppLayout } from "@/components/layout/app-layout"
import OverviewPage from "@/pages/overview"
import DemandsPage from "@/pages/demands"
import ProjectsPage from "@/pages/projects"
import FinancialPage from "@/pages/financial"
import DomusAIPage from "@/pages/domus-ai"
import NotFound from "@/pages/not-found"

function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
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
  )
}

export default AppRoutes
