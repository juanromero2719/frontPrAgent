"use client";

/**
 * Editor de reglas en markdown. Reemplaza a `project_rules/*.md`: lo que se
 * guarda aquí es lo que el bot inyecta en el prompt en la siguiente revisión, sin
 * redespliegue.
 *
 * Los dos tipos NO son lo mismo:
 *   · project_rules   → se añaden como convenciones del proyecto. Son la única
 *                       fuente de hallazgos de severidad MEDIA.
 *   · scope_override  → sustituye por completo el alcance de la revisión.
 *                       Úsalo cuando un repo necesite criterios distintos.
 */

import { useState } from "react";

import { api } from "@/lib/api";
import type { Rule, RuleKind } from "@/lib/types";
import { ActionButton, Banner, Field } from "@/components/ui";

const TIPOS: { kind: RuleKind; titulo: string; explicacion: string }[] = [
  {
    kind: "project_rules",
    titulo: "Convenciones del proyecto",
    explicacion:
      "Se añaden al alcance normal de la revisión. Es lo único que puede generar hallazgos de severidad MEDIA.",
  },
  {
    kind: "scope_override",
    titulo: "Alcance propio (sustituye)",
    explicacion:
      "Reemplaza por completo el alcance de la revisión, incluidas las convenciones de arriba. Déjalo vacío si no lo necesitas.",
  },
];

export function RulesEditor({
  scope,
  targetId,
  rules,
  editable,
  onSaved,
}: {
  scope: "servers" | "projects";
  targetId: string;
  /** Reglas que aplican a este ámbito exacto. */
  rules: Rule[];
  editable: boolean;
  onSaved: () => void;
}) {
  return (
    <div className="reglas">
      {TIPOS.map(({ kind, titulo, explicacion }) => (
        <RuleForm
          key={kind}
          kind={kind}
          titulo={titulo}
          explicacion={explicacion}
          existente={rules.find((r) => r.kind === kind)}
          scope={scope}
          targetId={targetId}
          editable={editable}
          onSaved={onSaved}
        />
      ))}
    </div>
  );
}

function RuleForm({
  kind,
  titulo,
  explicacion,
  existente,
  scope,
  targetId,
  editable,
  onSaved,
}: {
  kind: RuleKind;
  titulo: string;
  explicacion: string;
  existente?: Rule;
  scope: "servers" | "projects";
  targetId: string;
  editable: boolean;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(existente?.title ?? "");
  const [content, setContent] = useState(existente?.content_md ?? "");
  const [enabled, setEnabled] = useState(existente?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  const sucio =
    title !== (existente?.title ?? "") ||
    content !== (existente?.content_md ?? "") ||
    enabled !== (existente?.enabled ?? true);

  return (
    <div className="subcard">
      <h3>{titulo}</h3>
      <p className="muted">{explicacion}</p>

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

      <Field label="Título" hint="Solo para identificarlas en el panel">
        <input
          value={title}
          disabled={!editable}
          placeholder={kind === "project_rules" ? "Convenciones de backend" : "Alcance para frontend"}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field label="Contenido (markdown)">
        <textarea
          className="mono"
          rows={14}
          value={content}
          disabled={!editable}
          placeholder="## Reglas&#10;&#10;- Los métodos públicos llevan javadoc…"
          onChange={(e) => setContent(e.target.value)}
        />
      </Field>

      <div className="row">
        <label className="check">
          <input
            type="checkbox"
            checked={enabled}
            disabled={!editable}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Activa
        </label>

        {editable ? (
          <>
            <ActionButton
              primary
              disabled={!sucio}
              onError={setError}
              onAction={async () => {
                await api.put(`/api/${scope}/${targetId}/rules`, {
                  kind,
                  title,
                  content_md: content,
                  enabled,
                });
                setGuardado(true);
                onSaved();
              }}
            >
              Guardar
            </ActionButton>

            {existente ? (
              <ActionButton
                danger
                confirm="¿Borrar esta regla?"
                onError={setError}
                onAction={async () => {
                  await api.del(`/api/rules/${existente.id}`);
                  setTitle("");
                  setContent("");
                  setEnabled(true);
                  onSaved();
                }}
              >
                Borrar
              </ActionButton>
            ) : null}
          </>
        ) : null}

        <span className="muted">{content.length} caracteres</span>
      </div>
    </div>
  );
}
