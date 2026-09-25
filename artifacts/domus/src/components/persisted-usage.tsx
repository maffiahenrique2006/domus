import { useEffect, useState } from "react";
import { api } from "@/data/store";

type Usage = {
  usage: {
    purpose: string;
    model: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }[];
  daily: { calls: number; limit: number; timezone: string };
};

export function PersistedUsage({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    api<Usage>("/api/usage")
      .then((result) => {
        if (active) {
          setData(result);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, retry]);
  if (error)
    return (
      <p className="text-xs text-muted-foreground mt-3" role="status">
        Não foi possível atualizar o consumo salvo.{" "}
        <button
          className="underline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Tentar novamente
        </button>
      </p>
    );
  if (!data)
    return (
      <p className="text-xs text-muted-foreground mt-3">
        Carregando consumo salvo…
      </p>
    );
  const total = data.usage.reduce((sum, row) => sum + row.totalTokens, 0);
  return (
    <details className="mt-3 text-xs border border-border rounded-lg bg-secondary/20 p-3">
      <summary className="cursor-pointer leading-relaxed">
        Total salvo do escritório:{" "}
        <strong className="text-foreground">
          {total.toLocaleString("pt-BR")} tokens
        </strong>{" "}
        · entrevista + chat
      </summary>
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left whitespace-nowrap">
          <caption className="sr-only">
            Consumo persistido por finalidade e modelo
          </caption>
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              {["Uso", "Modelo", "Respostas", "Entrada", "Saída", "Total"].map(
                (label) => (
                  <th key={label} className="font-medium py-2 pr-4">
                    {label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {data.usage.map((row) => (
              <tr
                key={`${row.purpose}-${row.model}`}
                className="border-b border-border/50"
              >
                <td className="py-2 pr-4">
                  {row.purpose === "onboarding"
                    ? "Entrevista"
                    : row.purpose === "chat"
                      ? "Chat"
                      : row.purpose}
                </td>
                <td className="pr-4">{row.model}</td>
                <td className="pr-4">{row.calls}</td>
                <td className="pr-4">{row.inputTokens}</td>
                <td className="pr-4">{row.outputTokens}</td>
                <td>{row.totalTokens}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.usage.length && (
          <p className="text-muted-foreground py-3">
            Ainda não há consumo registrado.
          </p>
        )}
      </div>
      <p className="text-muted-foreground mt-3">
        Tentativas hoje: {data.daily.calls}/{data.daily.limit}. Limite diário
        reinicia à meia-noite {data.daily.timezone}. Tentativas que falham
        também contam para esse limite.
      </p>
      <p className="text-muted-foreground mt-2">
        O histórico de consumo permanece no servidor. Zerar a medição da sessão
        não apaga este total.
      </p>
    </details>
  );
}
