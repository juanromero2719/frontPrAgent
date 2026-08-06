"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { Member, Role } from "@/lib/types";
import { ActionButton, Badge, Banner, Field } from "@/components/ui";

const ROLES: { role: Role; que_puede: string }[] = [
  { role: "viewer", que_puede: "Solo mirar" },
  { role: "editor", que_puede: "Editar configuración, proyectos y reglas" },
  { role: "owner", que_puede: "Todo, más gestionar accesos y borrar el servidor" },
];

/** Quién puede ver y tocar este servidor. */
export function MembersModule({
  serverId,
  members,
  esOwner,
  onChanged,
}: {
  serverId: string;
  members: Member[];
  esOwner: boolean;
  onChanged: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <table className="tabla-datos">
        <thead>
          <tr>
            <th>Correo de Google</th>
            <th>Rol</th>
            <th>Estado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.email}>
              <td>{m.email}</td>
              <td>
                {esOwner ? (
                  <select
                    value={m.role}
                    onChange={async (e) => {
                      try {
                        await api.post(`/api/servers/${serverId}/members`, {
                          email: m.email,
                          role: e.target.value,
                        });
                        onChanged();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : String(err));
                      }
                    }}
                  >
                    {ROLES.map(({ role: r }) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone="muted">{m.role}</Badge>
                )}
              </td>
              <td>
                {m.linked ? (
                  <span className="muted">ha entrado</span>
                ) : (
                  <Badge tone="muted">pendiente</Badge>
                )}
              </td>
              <td className="acciones">
                {esOwner ? (
                  <ActionButton
                    danger
                    confirm={`¿Quitar el acceso de ${m.email}?`}
                    onError={setError}
                    onAction={async () => {
                      await api.del(
                        `/api/servers/${serverId}/members/${encodeURIComponent(m.email)}`,
                      );
                      onChanged();
                    }}
                  >
                    Quitar
                  </ActionButton>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        No hace falta que la persona haya entrado nunca: al iniciar sesión con ese
        correo verá el servidor con el rol que le des.
      </p>

      {esOwner ? (
        <div className="subcard">
          <div className="grid">
            <Field label="Correo de Google">
              <input
                type="email"
                value={email}
                placeholder="companera@empresa.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Rol" hint={ROLES.find((r) => r.role === role)?.que_puede}>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map(({ role: r }) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="row">
            <ActionButton
              primary
              disabled={!email.trim()}
              onError={setError}
              onAction={async () => {
                await api.post(`/api/servers/${serverId}/members`, {
                  email: email.trim(),
                  role,
                });
                setEmail("");
                onChanged();
              }}
            >
              Dar acceso
            </ActionButton>
          </div>
        </div>
      ) : null}
    </>
  );
}
