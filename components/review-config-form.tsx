"use client";

/**
 * Editor de los ajustes de revisión, compartido por servidores y proyectos.
 *
 * Regla clave de la interfaz: **campo vacío = hereda**. Un ajuste que no se
 * define aquí lo aporta el nivel de arriba (el servidor para un proyecto, las
 * variables de entorno del backend para un servidor). Por eso los valores no se
 * rellenan con defaults: hacerlo convertiría "no me importa" en "fíjalo a esto".
 */

import type { ReviewConfig } from "@/lib/types";
import { Field } from "@/components/ui";

const SEVERIDADES = ["LEVE", "MEDIA", "ALTA", "CRITICA"] as const;
const ESFUERZOS = ["none", "minimal", "low", "medium", "high", "xhigh", "max"] as const;

type NumKey =
  | "max_files"
  | "max_diff_chars"
  | "max_file_diff_chars"
  | "max_inline_comments"
  | "max_extra_context_chars"
  | "max_function_params";

const NUMERICOS: { key: NumKey; label: string; hint: string }[] = [
  { key: "max_files", label: "Máx. ficheros", hint: "Por MR, tras excluir ignorados" },
  { key: "max_diff_chars", label: "Máx. caracteres de diff", hint: "Por lote enviado al modelo" },
  { key: "max_file_diff_chars", label: "Máx. caracteres por fichero", hint: "Se trunca al pasarse" },
  { key: "max_inline_comments", label: "Máx. comentarios en línea", hint: "El resto va al resumen" },
  { key: "max_extra_context_chars", label: "Máx. caracteres de contexto extra", hint: "Ficheros traídos del repo" },
  { key: "max_function_params", label: "Máx. parámetros por función", hint: "Pasarse genera hallazgo MEDIA" },
];

export function ReviewConfigForm({
  value,
  onChange,
  disabled,
  scope,
}: {
  value: ReviewConfig;
  onChange: (next: ReviewConfig) => void;
  disabled?: boolean;
  scope: "servidor" | "proyecto";
}) {
  const heredaDe =
    scope === "proyecto" ? "hereda del servidor" : "hereda del backend";

  /** Escribe una clave, o la borra si el valor queda vacío (= heredar). */
  function set<K extends keyof ReviewConfig>(key: K, v: ReviewConfig[K] | undefined) {
    const next = { ...value };
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
      delete next[key];
    } else {
      next[key] = v;
    }
    onChange(next);
  }

  function setNumero(key: NumKey, raw: string) {
    if (raw.trim() === "") return set(key, undefined);
    const n = Number(raw);
    if (Number.isFinite(n)) set(key, n);
  }

  function setBooleano(key: "trigger_on_assign" | "trigger_on_reviewer" | "trigger_on_mention", raw: string) {
    if (raw === "") return set(key, undefined);
    set(key, raw === "true");
  }

  function toggleSeveridad(sev: (typeof SEVERIDADES)[number]) {
    const actuales = value.inline_severities ?? [];
    const next = actuales.includes(sev)
      ? actuales.filter((s) => s !== sev)
      : [...actuales, sev];
    set("inline_severities", next.length ? next : undefined);
  }

  return (
    <div className="config">
      <p className="muted config__nota">
        Campo vacío = {heredaDe}.
      </p>

      <div className="grid">
        {NUMERICOS.map(({ key, label, hint }) => (
          <Field key={key} label={label} hint={hint}>
            <input
              type="number"
              value={value[key] ?? ""}
              placeholder="hereda"
              disabled={disabled}
              onChange={(e) => setNumero(key, e.target.value)}
            />
          </Field>
        ))}

        <Field label="Idioma de la revisión" hint="Ej.: español">
          <input
            value={value.review_language ?? ""}
            placeholder="hereda"
            disabled={disabled}
            onChange={(e) => set("review_language", e.target.value)}
          />
        </Field>

        <Field label="Modelo" hint="Ej.: gpt-5.6-luna">
          <input
            value={value.openai_model ?? ""}
            placeholder="hereda"
            disabled={disabled}
            onChange={(e) => set("openai_model", e.target.value)}
          />
        </Field>

        <Field label="Esfuerzo de razonamiento" hint="Solo en modelos de razonamiento">
          <select
            value={value.openai_reasoning_effort ?? ""}
            disabled={disabled}
            onChange={(e) =>
              set(
                "openai_reasoning_effort",
                (e.target.value || undefined) as ReviewConfig["openai_reasoning_effort"],
              )
            }
          >
            <option value="">hereda</option>
            {ESFUERZOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Temperatura"
          hint="Déjalo vacío en modelos de razonamiento: no la aceptan"
        >
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={value.openai_temperature ?? ""}
            placeholder="hereda"
            disabled={disabled}
            onChange={(e) => {
              if (e.target.value.trim() === "") return set("openai_temperature", undefined);
              const n = Number(e.target.value);
              if (Number.isFinite(n)) set("openai_temperature", n);
            }}
          />
        </Field>

        <Field label="Comando para pedir revisión" hint="Ej.: /review">
          <input
            value={value.trigger_command ?? ""}
            placeholder="hereda"
            disabled={disabled}
            onChange={(e) => set("trigger_command", e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Severidades comentadas en línea"
        hint="Las demás se agrupan en el resumen. Sin ninguna marcada, hereda."
      >
        <div className="chips">
          {SEVERIDADES.map((sev) => {
            const activa = (value.inline_severities ?? []).includes(sev);
            return (
              <button
                key={sev}
                type="button"
                className={activa ? "chip chip--on" : "chip"}
                disabled={disabled}
                onClick={() => toggleSeveridad(sev)}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </Field>

      <div className="grid">
        {(
          [
            ["trigger_on_assign", "Al asignar el bot"],
            ["trigger_on_reviewer", "Al añadirlo como reviewer"],
            ["trigger_on_mention", "Al mencionarlo en un comentario"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <select
              value={value[key] === undefined ? "" : String(value[key])}
              disabled={disabled}
              onChange={(e) => setBooleano(key, e.target.value)}
            >
              <option value="">hereda</option>
              <option value="true">sí</option>
              <option value="false">no</option>
            </select>
          </Field>
        ))}
      </div>

      <Field
        label="Rutas ignoradas"
        hint="Un patrón por línea. Vacío = hereda."
      >
        <textarea
          rows={4}
          value={(value.ignore_globs ?? []).join("\n")}
          placeholder={"*.lock\ndist/*"}
          disabled={disabled}
          onChange={(e) => {
            const globs = e.target.value
              .split("\n")
              .map((g) => g.trim())
              .filter(Boolean);
            set("ignore_globs", globs.length ? globs : undefined);
          }}
        />
      </Field>
    </div>
  );
}
