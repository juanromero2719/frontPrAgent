"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { canEdit, isOwner, normalizeServerDetail } from "@/lib/types";
import type { ServerDetail } from "@/lib/types";
import { useTree } from "@/components/tree-context";
import { Badge, Banner } from "@/components/ui";
import { ModuleGrid, ModuleTabs, useModulo, type Modulo } from "@/components/module-nav";
import { ConnectionModule } from "@/components/modules/connection-module";
import { SettingsModule } from "@/components/modules/settings-module";
import { ProjectsModule } from "@/components/modules/projects-module";
import { MembersModule } from "@/components/modules/members-module";
import { WebhookModule } from "@/components/modules/webhook-module";
import { DangerModule } from "@/components/modules/danger-module";
import { RulesEditor } from "@/components/rules-editor";
import { ExtraContextEditor } from "@/components/extra-context-editor";

export default function ServerWorkspace({ serverId }: { serverId: string }) {
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

  /** Tras cualquier cambio hay que refrescar también el árbol de la izquierda. */
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

  const editable = canEdit(server.role);
  const esOwner = isOwner(server.role);

  const reglasServidor = server.rules.filter((r) => r.project_id === null);
  const contextoServidor = server.extra_context.filter((e) => e.project_id === null);
  const activos = server.projects.filter((p) => p.enabled).length;
  const ajustesDefinidos = Object.keys(server.review_config).length;

  const modulos: Modulo[] = [
    {
      id: "conexion",
      icono: "🔌",
      titulo: "Conexión",
      para: "Con qué credenciales habla el bot con este GitLab, y si está activo.",
      estado: server.has_gitlab_token
        ? `Token ${server.gitlab_token_hint} · @${server.bot_username}`
        : "Sin token: el bot no puede comentar",
    },
    {
      id: "proyectos",
      icono: "📁",
      titulo: "Proyectos",
      para: "Qué repositorios se revisan. Los nuevos aparecen solos, parados.",
      estado: `${activos} de ${server.projects.length} se revisan`,
    },
    {
      id: "ajustes",
      icono: "🎚️",
      titulo: "Ajustes de revisión",
      para: "Modelo, límites de diff, idioma y cuándo se dispara. Los heredan sus proyectos.",
      estado:
        ajustesDefinidos === 0
          ? "Todo heredado del backend"
          : `${ajustesDefinidos} definido(s) aquí`,
    },
    {
      id: "reglas",
      icono: "📋",
      titulo: "Reglas",
      para: "Las convenciones que el bot exige. Sustituye a los ficheros markdown.",
      estado: reglasServidor.length
        ? reglasServidor
            .map((r) => `${r.kind === "project_rules" ? "convenciones" : "alcance propio"}${r.enabled ? "" : " (parada)"}`)
            .join(" · ")
        : "Sin reglas propias",
    },
    {
      id: "contexto",
      icono: "🔍",
      titulo: "Contexto extra",
      para: "Ficheros del repo que se adjuntan al prompt para poder verificar de verdad.",
      estado: contextoServidor.length
        ? `${contextoServidor.length} regla(s)`
        : "Ninguna",
    },
    {
      id: "webhook",
      icono: "🔗",
      titulo: "Webhook",
      para: "El secreto que hay que pegar en GitLab para que lleguen los eventos.",
      estado: server.webhook_secret_hint,
    },
    {
      id: "accesos",
      icono: "👥",
      titulo: "Accesos",
      para: "Quién puede ver y tocar este servidor, y con qué permisos.",
      estado: `${server.members.length} persona(s)`,
    },
  ];

  if (esOwner) {
    modulos.push({
      id: "peligro",
      icono: "🗑️",
      titulo: "Borrar servidor",
      para: "Elimina el servidor con todos sus proyectos y reglas.",
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
            <strong>{server.name}</strong>
          </div>
          <h1>{server.name}</h1>
          <p className="muted">{server.gitlab_url}</p>
        </div>
        <div className="row row--tight">
          <Badge tone="muted">{server.role}</Badge>
          {server.enabled ? (
            <Badge tone="ok">activo</Badge>
          ) : (
            <Badge tone="err">desactivado</Badge>
          )}
        </div>
      </div>

      {!server.enabled ? (
        <Banner kind="error">
          El servidor está desactivado: no se revisa ningún merge request de sus
          proyectos. Se activa en <strong>Conexión</strong>.
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

            {/* key con el id del servidor: estos formularios guardan el valor
                inicial en su propio estado, así que al saltar de un servidor a
                otro (misma ruta, distinto parámetro) React reutilizaría el
                componente y seguiría mostrando los datos del anterior. */}
            {actual.id === "conexion" ? (
              <ConnectionModule
                key={server.id}
                server={server}
                editable={editable}
                onChanged={cambiado}
              />
            ) : null}

            {actual.id === "proyectos" ? (
              <ProjectsModule
                serverId={server.id}
                projects={server.projects}
                editable={editable}
                onChanged={cambiado}
              />
            ) : null}

            {actual.id === "ajustes" ? (
              <SettingsModule
                key={server.id}
                endpoint={`/api/servers/${server.id}`}
                scope="servidor"
                value={server.review_config}
                editable={editable}
                onChanged={cambiado}
              />
            ) : null}

            {actual.id === "reglas" ? (
              <RulesEditor
                key={server.id}
                scope="servers"
                targetId={server.id}
                rules={reglasServidor}
                editable={editable}
                onSaved={cambiado}
              />
            ) : null}

            {actual.id === "contexto" ? (
              <ExtraContextEditor
                key={server.id}
                scope="servers"
                targetId={server.id}
                items={contextoServidor}
                editable={editable}
                onSaved={cambiado}
              />
            ) : null}

            {actual.id === "webhook" ? (
              <WebhookModule server={server} editable={editable} />
            ) : null}

            {actual.id === "accesos" ? (
              <MembersModule
                serverId={server.id}
                members={server.members}
                esOwner={esOwner}
                onChanged={cambiado}
              />
            ) : null}

            {actual.id === "peligro" ? (
              <DangerModule
                que="servidor"
                nombre={server.name}
                arrastra={`sus ${server.projects.length} proyecto(s), reglas y accesos`}
                endpoint={`/api/servers/${server.id}`}
                volverA="/dashboard"
              />
            ) : null}
          </section>
        </>
      ) : (
        <>
          <p className="muted intro">¿Qué quieres configurar?</p>
          <ModuleGrid modulos={modulos} onAbrir={setModulo} />
        </>
      )}
    </>
  );
}
