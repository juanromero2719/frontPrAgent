"use client";

/** Piezas de interfaz que se repiten en todo el panel. */

import { useState } from "react";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

export function Banner({
  kind,
  children,
  onClose,
}: {
  kind: "error" | "ok";
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <p className={kind === "error" ? "notice" : "notice notice--ok"}>
      {children}
      {onClose ? (
        <button className="notice__close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      ) : null}
    </p>
  );
}

export function Badge({
  tone,
  children,
}: {
  tone: "ok" | "err" | "muted";
  children: React.ReactNode;
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

/**
 * Botón que ejecuta una acción asíncrona: se deshabilita mientras corre y deja
 * el error a la vista en lugar de perderlo en la consola.
 */
export function ActionButton({
  onAction,
  children,
  primary,
  danger,
  confirm,
  disabled,
  onError,
}: {
  onAction: () => Promise<void>;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  /** Texto de confirmación. Sin esto no se pregunta nada. */
  confirm?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      await onAction();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (onError) onError(message);
      else window.alert(message);
    } finally {
      setBusy(false);
    }
  }

  const clase = [primary ? "btn--primary" : "", danger ? "btn--danger" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={clase} onClick={run} disabled={busy || disabled}>
      {busy ? "…" : children}
    </button>
  );
}

export function Section({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="muted">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
