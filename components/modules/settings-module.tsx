"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { ReviewConfig } from "@/lib/types";
import { ActionButton, Banner } from "@/components/ui";
import { ReviewConfigForm } from "@/components/review-config-form";

/**
 * Ajustes de revisión. Vale igual para un servidor y para un proyecto: lo único
 * que cambia es a qué endpoint se manda y de quién hereda lo que no se define.
 */
export function SettingsModule({
  endpoint,
  scope,
  value,
  editable,
  onChanged,
}: {
  /** Ej.: `/api/servers/<id>` o `/api/projects/<id>`. */
  endpoint: string;
  scope: "servidor" | "proyecto";
  value: ReviewConfig;
  editable: boolean;
  onChanged: () => void;
}) {
  const [config, setConfig] = useState<ReviewConfig>(value);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const sucio = JSON.stringify(config) !== JSON.stringify(value);
  const definidos = Object.keys(config).length;

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}
      {guardado ? (
        <Banner kind="ok" onClose={() => setGuardado(false)}>
          Guardado. Se aplica en la siguiente revisión.
        </Banner>
      ) : null}

      <ReviewConfigForm
        scope={scope}
        value={config}
        onChange={setConfig}
        disabled={!editable}
      />

      <div className="row">
        {editable ? (
          <>
            <ActionButton
              primary
              disabled={!sucio}
              onError={setError}
              onAction={async () => {
                await api.patch(endpoint, { review_config: config });
                setGuardado(true);
                onChanged();
              }}
            >
              Guardar ajustes
            </ActionButton>
            {definidos > 0 ? (
              <ActionButton
                confirm="¿Volver a heredar todos los ajustes?"
                onError={setError}
                onAction={async () => {
                  await api.patch(endpoint, { review_config: {} });
                  setConfig({});
                  setGuardado(true);
                  onChanged();
                }}
              >
                Heredar todo
              </ActionButton>
            ) : null}
          </>
        ) : null}
        <span className="muted">
          {definidos === 0
            ? `Todo heredado del ${scope === "proyecto" ? "servidor" : "backend"}.`
            : `${definidos} ajuste(s) definido(s) aquí.`}
        </span>
      </div>
    </>
  );
}
