"use client";

/**
 * Contexto extra traído del repositorio (reemplaza EXTRA_CONTEXT_FILES).
 *
 * Cuando algún fichero cambiado en el MR contiene `patrón`, el bot descarga
 * `ruta` de la rama destino y la adjunta al prompt. Sirve para poder comprobar
 * de verdad reglas que dependen de otro fichero del repo (por ejemplo, si una
 * ruta nueva de Controller ya está registrada en el api-gateway) en vez de
 * suponerlo.
 *
 * Se guarda la lista entera de una vez, no fila a fila: es lo que encaja con un
 * editor de tabla y evita estados a medias.
 */

import { useState } from "react";

import { api } from "@/lib/api";
import type { ExtraContext } from "@/lib/types";
import { ActionButton, Banner } from "@/components/ui";

type Fila = { pattern: string; repo_path: string; enabled: boolean };

export function ExtraContextEditor({
  scope,
  targetId,
  items,
  editable,
  onSaved,
}: {
  scope: "servers" | "projects";
  targetId: string;
  items: ExtraContext[];
  editable: boolean;
  onSaved: () => void;
}) {
  const original: Fila[] = items.map((i) => ({
    pattern: i.pattern,
    repo_path: i.repo_path,
    enabled: i.enabled,
  }));
  const [filas, setFilas] = useState<Fila[]>(original);
  const [error, setError] = useState<string | null>(null);

  const sucio = JSON.stringify(filas) !== JSON.stringify(original);
  const completas = filas.filter((f) => f.pattern.trim() && f.repo_path.trim());

  function actualizar(i: number, cambio: Partial<Fila>) {
    setFilas(filas.map((f, idx) => (idx === i ? { ...f, ...cambio } : f)));
  }

  return (
    <div className="subcard">
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      {filas.length === 0 ? (
        <p className="muted">Sin reglas de contexto extra.</p>
      ) : (
        <div className="tabla">
          <div className="tabla__head">
            <span>Si un fichero cambiado contiene…</span>
            <span>…adjunta este fichero del repo</span>
            <span />
          </div>
          {filas.map((f, i) => (
            <div className="tabla__row" key={i}>
              <input
                value={f.pattern}
                disabled={!editable}
                placeholder="Controller"
                onChange={(e) => actualizar(i, { pattern: e.target.value })}
              />
              <input
                value={f.repo_path}
                disabled={!editable}
                placeholder="api-gateway/src/main/resources/application.yml"
                onChange={(e) => actualizar(i, { repo_path: e.target.value })}
              />
              {editable ? (
                <button
                  className="btn--danger"
                  onClick={() => setFilas(filas.filter((_, idx) => idx !== i))}
                >
                  Quitar
                </button>
              ) : (
                <span />
              )}
            </div>
          ))}
        </div>
      )}

      {editable ? (
        <div className="row">
          <button
            onClick={() =>
              setFilas([...filas, { pattern: "", repo_path: "", enabled: true }])
            }
          >
            Añadir fila
          </button>
          <ActionButton
            primary
            disabled={!sucio}
            onError={setError}
            onAction={async () => {
              // Las filas a medio rellenar se descartan en vez de dar un 422.
              await api.put(`/api/${scope}/${targetId}/extra-context`, {
                items: completas,
              });
              onSaved();
            }}
          >
            Guardar lista
          </ActionButton>
          {filas.length !== completas.length ? (
            <span className="muted">
              {filas.length - completas.length} fila(s) incompleta(s) se descartarán
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
