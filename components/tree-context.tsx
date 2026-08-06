"use client";

/**
 * Estado compartido del árbol de servidores y proyectos.
 *
 * La barra lateral vive en el layout y el contenido en la página: son
 * componentes hermanos, así que si cada uno pidiera sus datos por su cuenta se
 * desincronizarían en cuanto activases un proyecto (el contenido se enteraría y
 * la barra no). Con un contexto único, `refresh()` actualiza las dos cosas a la
 * vez tras cada cambio.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api } from "@/lib/api";
import type { ServerWithProjects } from "@/lib/types";

type TreeState = {
  servers: ServerWithProjects[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const TreeContext = createContext<TreeState | null>(null);

/**
 * Deja la respuesta en una forma con la que el resto del panel pueda contar.
 *
 * El frontend y el backend se despliegan por separado, así que en cualquier
 * momento puede haber uno más nuevo que el otro. Un backend anterior a que el
 * listado incluyera `projects` no manda ese campo, y sin esto la barra lateral
 * se cae con "Cannot read properties of undefined" y se lleva el panel entero
 * por delante. Normalizar aquí, en la frontera, evita que cada vista tenga que
 * defenderse por su cuenta.
 */
function normalizar(datos: unknown): ServerWithProjects[] {
  if (!Array.isArray(datos)) return [];
  return datos.map((s) => {
    const server = s as ServerWithProjects;
    return {
      ...server,
      projects: Array.isArray(server.projects) ? server.projects : [],
      projectsUnknown: !Array.isArray(server.projects),
    };
  });
}

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = useState<ServerWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const datos = await api.get<ServerWithProjects[]>("/api/servers");
      setServers(normalizar(datos));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <TreeContext.Provider value={{ servers, loading, error, refresh }}>
      {children}
    </TreeContext.Provider>
  );
}

export function useTree(): TreeState {
  const ctx = useContext(TreeContext);
  if (!ctx) throw new Error("useTree se usa dentro de <TreeProvider>");
  return ctx;
}
