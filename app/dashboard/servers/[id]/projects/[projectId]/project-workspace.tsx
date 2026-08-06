"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { canEdit, normalizeServerDetail } from "@/lib/types";
import type { ServerDetail } from "@/lib/types";
import { useTree } from "@/components/tree-context";
import { ActionButton, Badge, Banner } from "@/components/ui";
import { ModuleGrid, ModuleTabs, useModulo, type Modulo } from "@/components/module-nav";
import { SettingsModule } from "@/components/modules/settings-module";
import { DangerModule } from "@/components/modules/danger-module";
import { RulesEditor } from "@/components/rules-editor";
import { ExtraContextEditor } from "@/components/extra-context-editor";

/**
 * Configuración de un proyecto concreto.
 *
 * Se pide el detalle del SERVIDOR, no del proyecto: es una sola petición que ya
 * trae sus proyectos, reglas y contexto, y así se puede enseñar de quién hereda
 * cada cosa sin encadenar llamadas.
 */
export default function ProjectWorkspace({
  serverId,
  projectId,
}: {
  serverId: string;
  projectId: string;
}) {
  const [server, setServer] = useState<ServerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modulo, setModulo] = useModulo();
  const { refresh: refrescarArbol } = useTree();

  const cargar = useCallback(async () => {
    try {
      setServer(normalizeServerDetail(await api.get<ServerDetail>(`/api/servers/${serverId}`)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [serverId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cambiado = useCallback(async () => {
    await Promise.all([cargar(), refrescarArbol()]);
  }, [cargar, refrescarArbol]);

  if (error) {
    return (
      <>
        <Banner kind="error">{error}</Banner>
        <Link href="/dashboard">← Volver al inicio</Link>
      </>
    );
  }
  if (!server) return <p className="muted">Cargando…</p>;

  const project = server.projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <>
        <Banner kind="error">
          Este proyecto ya no existe en {server.name}.
        </Banner>
        <Link href={`/dashboard/servers/${serverId}?m=proyectos`}>
          ← Ver los proyectos del servidor
        </Link>
      </>
    );
  }

  const editable = canEdit(server.role);
  const etiqueta =
    project.path_with_namespace || project.name || `Proyecto ${project.gitlab_project_id}`;

  const reglasProyecto = server.rules.filter((r) => r.project_id === project.id);
  const reglasHeredadas = server.rules.filter((r) => r.project_id === null && r.enabled);
  const contextoProyecto = server.extra_context.filter((e) => e.project_id === project.id);
  const ajustesDefinidos = Object.keys(project.review_config).length;

  const modulos: Modulo[] = [
    {
      id: "ajustes",
      icono: "🎚️",
      titulo: "Ajustes de revisión",
      para: "Pisa los del servidor solo para este proyecto. Vacío = hereda.",
      estado:
        ajustesDefinidos === 0
          ? "Todo heredado del servidor"
          : `${ajustesDefinidos} definido(s) aquí`,
    },
    {
      id: "reglas",
      icono: "📋",
      titulo: "Reglas",
      para: "Convenciones propias de este repositorio. Sustituyen a las del servidor.",
      estado: reglasProyecto.length
        ? `${reglasProyecto.length} propia(s)`
        : reglasHeredadas.length
          ? `Heredando ${reglasHeredadas.length} del servidor`
          : "Sin reglas",
    },
    {
      id: "contexto",
      icono: "🔍",
      titulo: "Contexto extra",
      para: "Ficheros de este repo que se adjuntan al prompt según lo que toque el diff.",
      estado: contextoProyecto.length ? `${contextoProyecto.length} regla(s)` : "Ninguna",
    },
  ];

  if (editable) {
    modulos.push({
      id: "peligro",
      icono: "🗑️",
      titulo: "Quitar proyecto",
      para: "Deja de revisarlo y borra sus reglas propias. Para pararlo sin borrar, desactívalo.",
      cuidado: true,
    });
  }

  const actual = modulos.find((m) => m.id === modulo);

  return (
    <>
      <div className="cabecera">
        <div>
          <div className="miga">
            <Link href="/dashboard">Servidores</Link>
            <span>/</span>
            <Link href={`/dashboard/servers/${serverId}`}>{server.name}</Link>
            <span>/</span>
            <strong>{etiqueta}</strong>
          </div>
          <h1>{etiqueta}</h1>
          <p className="muted">ID en GitLab: {project.gitlab_project_id}</p>
        </div>
        <div className="row row--tight">
          {project.enabled ? (
            <Badge tone="ok">se revisa</Badge>
          ) : (
            <Badge tone="err">parado</Badge>
          )}
          {editable ? (
            <ActionButton
              onError={setError}
              onAction={async () => {
                await api.patch(`/api/projects/${project.id}`, {
                  enabled: !project.enabled,
                });
                await cambiado();
              }}
            >
              {project.enabled ? "Parar" : "Activar"}
            </ActionButton>
          ) : null}
        </div>
      </div>

      {!project.enabled ? (
        <Banner kind="error">
          Este proyecto está parado: sus merge requests no se revisan aunque
          lleguen los webhooks.
        </Banner>
      ) : null}

      {actual ? (
        <>
          <ModuleTabs modulos={modulos} actual={actual.id} onCambiar={setModulo} />
          <section className="panel">
            <div className="panel__head">
              <h2>
                <span aria-hidden="true">{actual.icono}</span> {actual.titulo}
              </h2>
              <p className="muted">{actual.para}</p>
            </div>

            {/* key con el id del proyecto: estos formularios guardan el valor
                inicial en su propio estado, así que al saltar de un proyecto a
                otro (misma ruta, distinto parámetro) React reutilizaría el
                componente y seguiría mostrando los datos del anterior. */}
            {actual.id === "ajustes" ? (
              <SettingsModule
                key={project.id}
                endpoint={`/api/projects/${project.id}`}
                scope="proyecto"
                value={project.review_config}
                editable={editable}
                onChanged={cambiado}
              />
            ) : null}

            {actual.id === "reglas" ? (
              <>
                {reglasHeredadas.length && !reglasProyecto.length ? (
                  <p className="muted">
                    Ahora mismo hereda las reglas del servidor. Si escribes aquí,
                    dejarán de aplicarse para este proyecto.
                  </p>
                ) : null}
                <RulesEditor
                  key={project.id}
                  scope="projects"
                  targetId={project.id}
                  rules={reglasProyecto}
                  editable={editable}
                  onSaved={cambiado}
                />
              </>
            ) : null}

            {actual.id === "contexto" ? (
              <ExtraContextEditor
                key={project.id}
                scope="projects"
                targetId={project.id}
                items={contextoProyecto}
                editable={editable}
                onSaved={cambiado}
              />
            ) : null}

            {actual.id === "peligro" ? (
              <DangerModule
                que="proyecto"
                nombre={String(project.gitlab_project_id)}
                arrastra="sus reglas y ajustes propios"
                endpoint={`/api/projects/${project.id}`}
                volverA={`/dashboard/servers/${serverId}?m=proyectos`}
              />
            ) : null}
          </section>
        </>
      ) : (
        <>
          <p className="muted intro">¿Qué quieres configurar de este proyecto?</p>
          <ModuleGrid modulos={modulos} onAbrir={setModulo} />
        </>
      )}
    </>
  );
}
