"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import { useTree } from "@/components/tree-context";
import type { Project, ServerWithProjects } from "@/lib/types";

/**
 * Árbol de navegación: servidores y, dentro, sus proyectos.
 *
 * El servidor al que pertenece la ruta actual se abre solo, para que al entrar
 * por un enlace directo a un proyecto no aparezca el árbol colapsado sin pistas
 * de dónde estás.
 */
export function Sidebar() {
  const { servers, loading, error } = useTree();
  const pathname = usePathname();
  const [filtro, setFiltro] = useState("");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());

  const servidorActual = useMemo(() => {
    const m = pathname.match(/\/dashboard\/servers\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return servers;
    return servers
      .map((s) => ({
        ...s,
        projects: s.projects.filter((p) =>
          `${p.path_with_namespace} ${p.name} ${p.gitlab_project_id}`
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter(
        (s) =>
          s.projects.length > 0 ||
          `${s.name} ${s.gitlab_url}`.toLowerCase().includes(q),
      );
  }, [servers, filtro]);

  const totalProyectos = servers.reduce((n, s) => n + s.projects.length, 0);

  return (
    <nav className="sidebar" aria-label="Servidores y proyectos">
      <Link
        href="/dashboard"
        className={pathname === "/dashboard" ? "sidebar__home is-active" : "sidebar__home"}
      >
        Inicio
      </Link>

      {totalProyectos > 6 || servers.length > 3 ? (
        <input
          className="sidebar__filtro"
          value={filtro}
          placeholder="Filtrar…"
          onChange={(e) => setFiltro(e.target.value)}
        />
      ) : null}

      {loading ? <p className="sidebar__nota">Cargando…</p> : null}
      {error ? <p className="sidebar__nota sidebar__nota--err">{error}</p> : null}
      {!loading && !error && servers.length === 0 ? (
        <p className="sidebar__nota">
          Sin servidores. Créalo desde <strong>Inicio</strong>.
        </p>
      ) : null}

      <ul className="arbol">
        {filtrados.map((s) => (
          <ItemServidor
            key={s.id}
            server={s}
            abierto={!cerrados.has(s.id) || s.id === servidorActual}
            onToggle={() =>
              setCerrados((prev) => {
                const next = new Set(prev);
                if (next.has(s.id)) next.delete(s.id);
                else next.add(s.id);
                return next;
              })
            }
            pathname={pathname}
          />
        ))}
      </ul>
    </nav>
  );
}

function ItemServidor({
  server,
  abierto,
  onToggle,
  pathname,
}: {
  server: ServerWithProjects;
  abierto: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const rutaServidor = `/dashboard/servers/${server.id}`;
  const activo = pathname === rutaServidor;
  const activos = server.projects.filter((p) => p.enabled).length;

  return (
    <li className="arbol__servidor">
      <div className="arbol__fila">
        <button
          className="arbol__toggle"
          onClick={onToggle}
          aria-expanded={abierto}
          aria-label={abierto ? "Colapsar" : "Expandir"}
        >
          {abierto ? "▾" : "▸"}
        </button>
        <Link href={rutaServidor} className={activo ? "arbol__enlace is-active" : "arbol__enlace"}>
          <span
            className={server.enabled ? "punto punto--ok" : "punto punto--off"}
            title={server.enabled ? "Servidor activo" : "Servidor desactivado"}
          />
          <span className="arbol__nombre">{server.name}</span>
          <span className="arbol__cuenta">
            {server.projectsUnknown ? "—" : `${activos}/${server.projects.length}`}
          </span>
        </Link>
      </div>

      {abierto ? (
        server.projectsUnknown ? (
          <p className="arbol__vacio">
            El backend no los devuelve todavía. Ábrelo para verlos.
          </p>
        ) : server.projects.length === 0 ? (
          <p className="arbol__vacio">Sin proyectos</p>
        ) : (
          <ul className="arbol__proyectos">
            {server.projects.map((p) => (
              <ItemProyecto
                key={p.id}
                serverId={server.id}
                project={p}
                pathname={pathname}
              />
            ))}
          </ul>
        )
      ) : null}
    </li>
  );
}

function ItemProyecto({
  serverId,
  project,
  pathname,
}: {
  serverId: string;
  project: Project;
  pathname: string;
}) {
  const ruta = `/dashboard/servers/${serverId}/projects/${project.id}`;
  const etiqueta =
    project.path_with_namespace || project.name || `Proyecto ${project.gitlab_project_id}`;

  return (
    <li>
      <Link
        href={ruta}
        className={pathname === ruta ? "arbol__enlace is-active" : "arbol__enlace"}
        title={`${etiqueta} · ID ${project.gitlab_project_id}`}
      >
        <span
          className={project.enabled ? "punto punto--ok" : "punto punto--off"}
          title={project.enabled ? "Se revisa" : "No se revisa"}
        />
        <span className="arbol__nombre">{etiqueta}</span>
      </Link>
    </li>
  );
}
