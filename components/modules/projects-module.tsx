"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { ActionButton, Badge, Banner, Field } from "@/components/ui";

/** Qué proyectos de este servidor se revisan. */
export function ProjectsModule({
  serverId,
  projects,
  editable,
  onChanged,
}: {
  serverId: string;
  projects: Project[];
  editable: boolean;
  onChanged: () => void;
}) {
  const [anadiendo, setAnadiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const desactivados = projects.filter((p) => !p.enabled).length;

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      {desactivados > 0 ? (
        <p className="muted">
          {desactivados} proyecto(s) desactivado(s): reciben webhooks pero no se
          revisan. Los que aparecen solos entran así.
        </p>
      ) : null}

      {projects.length === 0 ? (
        <p className="muted">
          Ninguno todavía. Asigna el bot a un merge request y el proyecto
          aparecerá aquí solo, o añádelo a mano si ya sabes su ID.
        </p>
      ) : (
        <table className="tabla-datos">
          <thead>
            <tr>
              <th>Proyecto</th>
              <th>ID</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/dashboard/servers/${serverId}/projects/${p.id}`}>
                    {p.path_with_namespace || p.name || `Proyecto ${p.gitlab_project_id}`}
                  </Link>
                </td>
                <td className="mono-cell">{p.gitlab_project_id}</td>
                <td>
                  {p.enabled ? (
                    <Badge tone="ok">se revisa</Badge>
                  ) : (
                    <Badge tone="err">parado</Badge>
                  )}
                </td>
                <td className="acciones">
                  {editable ? (
                    <ActionButton
                      onError={setError}
                      onAction={async () => {
                        await api.patch(`/api/projects/${p.id}`, { enabled: !p.enabled });
                        onChanged();
                      }}
                    >
                      {p.enabled ? "Parar" : "Activar"}
                    </ActionButton>
                  ) : null}
                  <Link
                    className="boton-enlace"
                    href={`/dashboard/servers/${serverId}/projects/${p.id}`}
                  >
                    Configurar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editable ? (
        <div className="row">
          <button onClick={() => setAnadiendo((v) => !v)}>
            {anadiendo ? "Cancelar" : "Añadir proyecto a mano"}
          </button>
        </div>
      ) : null}

      {anadiendo ? (
        <NuevoProyecto
          serverId={serverId}
          onCreado={() => {
            setAnadiendo(false);
            onChanged();
          }}
        />
      ) : null}
    </>
  );
}

function NuevoProyecto({
  serverId,
  onCreado,
}: {
  serverId: string;
  onCreado: () => void;
}) {
  const [gitlabId, setGitlabId] = useState("");
  const [path, setPath] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="subcard">
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}
      <div className="grid">
        <Field label="ID del proyecto en GitLab" hint="Aparece en la portada del repo">
          <input
            type="number"
            value={gitlabId}
            onChange={(e) => setGitlabId(e.target.value)}
          />
        </Field>
        <Field label="Ruta" hint="Ej.: grupo/subgrupo/repo (opcional)">
          <input value={path} onChange={(e) => setPath(e.target.value)} />
        </Field>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Empezar a revisarlo ya
      </label>
      <div className="row">
        <ActionButton
          primary
          disabled={!gitlabId.trim()}
          onError={setError}
          onAction={async () => {
            await api.post(`/api/servers/${serverId}/projects`, {
              gitlab_project_id: Number(gitlabId) || 0,
              path_with_namespace: path,
              enabled,
            });
            onCreado();
          }}
        >
          Añadir
        </ActionButton>
      </div>
    </div>
  );
}
