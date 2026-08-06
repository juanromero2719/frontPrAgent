"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/api";
import { useTree } from "@/components/tree-context";
import { ActionButton, Badge, Banner, Field } from "@/components/ui";

/** Portada del panel: estado de un vistazo y alta de servidores. */
export default function Home() {
  const { servers, loading, error, refresh } = useTree();
  const [creando, setCreando] = useState(false);

  const proyectos = servers.reduce((n, s) => n + s.projects.length, 0);
  const activos = servers.reduce(
    (n, s) => n + s.projects.filter((p) => p.enabled).length,
    0,
  );
  // Backend anterior a que el listado incluyera los proyectos: no se puede
  // afirmar un recuento, así que se avisa en vez de enseñar ceros falsos.
  const sinProyectosEnListado = servers.some((s) => s.projectsUnknown);

  return (
    <>
      <div className="cabecera">
        <div>
          <h1>Servidores</h1>
          <p className="muted">
            Cada servidor de GitLab tiene su propio bot, sus proyectos y sus
            reglas. Elige uno en la izquierda para configurarlo.
          </p>
        </div>
        <button onClick={() => setCreando((v) => !v)}>
          {creando ? "Cancelar" : "Añadir servidor"}
        </button>
      </div>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {sinProyectosEnListado ? (
        <Banner kind="error">
          El backend desplegado es anterior a este panel: su listado de servidores
          todavía no incluye los proyectos, así que el árbol de la izquierda sale
          vacío. Redespliega el backend y desaparece este aviso. Entrando a cada
          servidor sí se ven sus proyectos.
        </Banner>
      ) : null}

      {creando ? (
        <NuevoServidor
          onCreado={async () => {
            setCreando(false);
            await refresh();
          }}
        />
      ) : null}

      {loading ? (
        <p className="muted">Cargando…</p>
      ) : servers.length === 0 ? (
        <section className="panel">
          <h2>Empieza por aquí</h2>
          <ol className="pasos pasos--grande">
            <li>
              <strong>Añade un servidor</strong> con la URL de tu GitLab y el token
              del bot.
            </li>
            <li>
              Usa <strong>Probar conexión</strong> para confirmar que el token vale.
            </li>
            <li>
              Copia su <strong>secreto de webhook</strong> y pégalo en GitLab
              (Settings → Webhooks).
            </li>
            <li>
              Asigna el bot a un merge request: el proyecto aparecerá solo,
              parado. Actívalo y ya se revisa.
            </li>
          </ol>
        </section>
      ) : (
        <>
          <div className="resumen">
            <div className="resumen__dato">
              <strong>{servers.length}</strong>
              <span>servidor(es)</span>
            </div>
            <div className="resumen__dato">
              <strong>{sinProyectosEnListado ? "—" : proyectos}</strong>
              <span>proyecto(s)</span>
            </div>
            <div className="resumen__dato">
              <strong>{sinProyectosEnListado ? "—" : activos}</strong>
              <span>en revisión</span>
            </div>
          </div>

          <div className="tarjetas">
            {servers.map((s) => {
              const suyosActivos = s.projects.filter((p) => p.enabled).length;
              return (
                <Link key={s.id} href={`/dashboard/servers/${s.id}`} className="tarjeta">
                  <div className="tarjeta__head">
                    <strong>{s.name}</strong>
                    {s.enabled ? (
                      <Badge tone="ok">activo</Badge>
                    ) : (
                      <Badge tone="err">parado</Badge>
                    )}
                  </div>
                  <span className="muted">{s.gitlab_url}</span>
                  <div className="tarjeta__pie">
                    <span>
                      {s.projectsUnknown
                        ? "Abre el servidor para ver sus proyectos"
                        : `${suyosActivos}/${s.projects.length} proyecto(s) en revisión`}
                    </span>
                    <Badge tone="muted">{s.role}</Badge>
                  </div>
                  {!s.has_gitlab_token ? (
                    <span className="tarjeta__alerta">Le falta el token de GitLab</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function NuevoServidor({ onCreado }: { onCreado: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [gitlabUrl, setGitlabUrl] = useState("https://");
  const [token, setToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [botUserId, setBotUserId] = useState("");
  const [botUsername, setBotUsername] = useState("ai-reviewer");
  const [verifySsl, setVerifySsl] = useState(true);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="panel">
      <h2>Nuevo servidor</h2>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}

      <div className="grid">
        <Field label="Nombre" hint="Para identificarlo en el panel">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="GitLab de Eduxperia"
          />
        </Field>
        <Field label="URL de GitLab" hint="Sin barra final">
          <input value={gitlabUrl} onChange={(e) => setGitlabUrl(e.target.value)} />
        </Field>
        <Field label="Token del bot" hint="Personal Access Token con scope api">
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="glpat-…"
          />
        </Field>
        <Field label="API key de OpenAI" hint="Vacío = usa la del backend">
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-…"
          />
        </Field>
        <Field label="ID del usuario bot" hint="GET /api/v4/user con su token">
          <input
            type="number"
            value={botUserId}
            onChange={(e) => setBotUserId(e.target.value)}
          />
        </Field>
        <Field label="Usuario del bot" hint="Sin la @">
          <input value={botUsername} onChange={(e) => setBotUsername(e.target.value)} />
        </Field>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={verifySsl}
          onChange={(e) => setVerifySsl(e.target.checked)}
        />
        Verificar el certificado TLS (desactívalo solo con certificado autofirmado)
      </label>

      <div className="row">
        <ActionButton
          primary
          disabled={!name.trim() || gitlabUrl.length < 9}
          onError={setError}
          onAction={async () => {
            await api.post("/api/servers", {
              name,
              gitlab_url: gitlabUrl.replace(/\/+$/, ""),
              gitlab_token: token,
              openai_api_key: openaiKey,
              bot_user_id: Number(botUserId) || 0,
              bot_username: botUsername,
              verify_ssl: verifySsl,
            });
            await onCreado();
          }}
        >
          Crear servidor
        </ActionButton>
      </div>
    </section>
  );
}
