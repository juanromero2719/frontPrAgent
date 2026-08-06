/**
 * Cliente del backend, visto desde el navegador.
 *
 * Todo pasa por el proxy de `/api/backend/...`, que es quien añade la identidad
 * de Google. Aquí solo se traduce el error del backend a algo que la interfaz
 * pueda mostrar sin adivinar.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Saca un mensaje legible de las distintas formas de error que devuelve FastAPI. */
function messageFrom(status: number, payload: unknown): string {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;

    if (typeof body.error === "string") return body.error;

    // 422 de pydantic: lista de errores con su ruta dentro del cuerpo.
    if (Array.isArray(body.detail)) {
      const partes = body.detail.map((d) => {
        const item = d as { loc?: unknown[]; msg?: string };
        const donde = (item.loc ?? [])
          .filter((l) => l !== "body")
          .join(".");
        return donde ? `${donde}: ${item.msg}` : (item.msg ?? "valor inválido");
      });
      if (partes.length) return partes.join(" · ");
    }
    if (typeof body.detail === "string") return body.detail;
  }

  return `Error ${status}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/backend${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (res.status === 204) return undefined as T;

  const texto = await res.text();
  let payload: unknown = texto;
  try {
    payload = JSON.parse(texto);
  } catch {
    // Respuesta que no es JSON (un 502 del proxy, por ejemplo).
  }

  if (!res.ok) throw new ApiError(res.status, messageFrom(res.status, payload));
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
};
