"use client";

import { useState } from "react";

type Result = {
  status: number;
  body: string;
};

export default function HealthCheck() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function llamar() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/backend/health_2", { cache: "no-store" });
      const texto = await res.text();
      let body = texto;
      try {
        body = JSON.stringify(JSON.parse(texto), null, 2);
      } catch {
        // El backend devolvió algo que no es JSON: se muestra tal cual.
      }
      setResult({ status: res.status, body });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>
        GET <code>/health_2</code>
      </h2>
      <p className="muted">
        Endpoint del backend que solo responde si la petición llega con una
        identidad de Google válida.
      </p>

      <div className="row">
        <button onClick={llamar} disabled={loading}>
          {loading ? "Llamando…" : "Probar /health_2"}
        </button>
        {result ? (
          <span
            className={`badge ${result.status === 200 ? "badge--ok" : "badge--err"}`}
          >
            HTTP {result.status}
          </span>
        ) : null}
      </div>

      {error ? <p className="notice">{error}</p> : null}
      {result ? <pre>{result.body}</pre> : null}
    </section>
  );
}
