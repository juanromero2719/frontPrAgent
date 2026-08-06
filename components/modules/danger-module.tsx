"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import { ActionButton, Banner } from "@/components/ui";

/** Borrados que no se pueden deshacer. */
export function DangerModule({
  que,
  nombre,
  arrastra,
  endpoint,
  volverA,
}: {
  /** "servidor" o "proyecto". */
  que: string;
  nombre: string;
  /** Qué se lleva por delante, en una frase. */
  arrastra: string;
  endpoint: string;
  volverA: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState("");

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <p>
        Borrar este {que} elimina también {arrastra}. No se puede deshacer.
      </p>
      <p className="muted">
        Si solo quieres que deje de revisar, desactívalo en su lugar: se conserva
        toda la configuración.
      </p>

      <div className="subcard">
        <p>
          Escribe <code>{nombre}</code> para confirmar:
        </p>
        <input
          value={confirmacion}
          placeholder={nombre}
          onChange={(e) => setConfirmacion(e.target.value)}
        />
        <div className="row">
          <ActionButton
            danger
            disabled={confirmacion.trim() !== nombre}
            onError={setError}
            onAction={async () => {
              await api.del(endpoint);
              window.location.href = volverA;
            }}
          >
            Borrar este {que}
          </ActionButton>
        </div>
      </div>
    </>
  );
}
