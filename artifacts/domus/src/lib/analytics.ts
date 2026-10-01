// Analytics de produto (PostHog). Só liga quando VITE_POSTHOG_KEY existe no build;
// sem a chave, todas as funções viram no-op e o app funciona igual.
//
// Privacidade: identificamos a pessoa só pelo id interno e pelo plano. Não enviamos
// e-mail, nome, nem conteúdo digitado (briefing, perguntas, nomes de clientes).
// A gravação de sessão e os cliques automáticos mascaram todo texto da tela.
import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const host =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ||
  "https://us.i.posthog.com";

let started = false;

export function startAnalytics() {
  if (started || !key) return;
  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: true,
    // Cliques e gravações nunca levam texto da tela (nomes de clientes, valores).
    mask_all_text: true,
    mask_all_element_attributes: true,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
  });
  started = true;
}

export function identify(user: { id: number; plan: string }) {
  if (!started) return;
  posthog.identify(`domus-user-${user.id}`, { plan: user.plan });
}

export function resetIdentity() {
  if (!started) return;
  posthog.reset();
}

/** Nomes de eventos fechados: o painel do PostHog fica legível e ninguém inventa variação. */
export type DomusEvent =
  | "onboarding_interview_sent"
  | "onboarding_confirmed"
  | "ai_question_sent"
  | "ai_proposals_received"
  | "ai_proposals_confirmed"
  | "case_stage_changed"
  | "task_completed"
  | "checkout_started"
  | "plan_upgraded";

export function track(
  event: DomusEvent,
  properties?: Record<string, string | number | boolean>,
) {
  if (!started) return;
  posthog.capture(event, properties);
}
