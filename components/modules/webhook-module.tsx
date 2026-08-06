"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { ServerDetail } from "@/lib/types";
import { ActionButton, Banner } from "@/components/ui";

/** Cómo se conecta GitLab con el bot. */
export function WebhookModule({
  server,
  editable,
}: {
  server: ServerDetail;
  editable: boolean;
}) {
  const [secreto, setSecreto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <p className="muted">
        Este secreto es lo que identifica al servidor: cada evento que llega se
        resuelve a partir de él, así que no lo compartas entre instancias.
      </p>

      <ol className="pasos">
        <li>
          En GitLab: <strong>Proyecto → Settings → Webhooks → Add new webhook</strong>.
        </li>
        <li>
          <strong>URL</strong>: <code>{"<URL del backend>"}/webhook</code>
        </li>
        <li>
          <strong>Secret token</strong>: el de abajo.
        </li>
        <li>
          <strong>Trigger</strong>: marca <em>Merge request events</em> y{" "}
          <em>Comments</em>.
        </li>
      </ol>

      <div className="row">
        <code className="secreto">{secreto ?? server.webhook_secret_hint}</code>
        {editable && !secreto ? (
          <ActionButton
            onError={setError}
            onAction={async () => {
              const r = await api.get<{ webhook_secret: string }>(
                `/api/servers/${server.id}/webhook-secret`,
              );
              setSecreto(r.webhook_secret);
            }}
          >
            Mostrar
          </ActionButton>
        ) : null}
        {secreto ? (
          <>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(secreto);
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
            <button onClick={() => setSecreto(null)}>Ocultar</button>
          </>
        ) : null}
      </div>

      {!editable ? (
        <p className="muted">Hace falta rol editor u owner para verlo entero.</p>
      ) : null}
    </>
  );
}
