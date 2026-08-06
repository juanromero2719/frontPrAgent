/**
 * Proxy autenticado hacia el backend (webhookAgentPR).
 *
 * El navegador nunca habla directamente con el backend ni ve el id_token de
 * Google: llama aquí, este handler comprueba que haya sesión y reenvía la
 * petición con la identidad del usuario. El backend decide los permisos según
 * el rol que tenga esa persona sobre el servidor.
 */
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import type { JWT } from "next-auth/jwt";

import { auth } from "@/auth";

const BACKEND_URL = (process.env.BACKEND_URL ?? "").replace(/\/+$/, "");

/**
 * Qué se puede alcanzar por este proxy. Es una lista blanca a propósito: sin
 * ella, cualquier usuario logueado podría llamar a `/webhook` y disparar
 * revisiones falsas.
 */
const ALLOWED_EXACT = new Set(["health", "health_2"]);
const ALLOWED_PREFIXES = ["api/"];

function isAllowed(path: string): boolean {
  if (ALLOWED_EXACT.has(path)) return true;
  return ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function json(body: unknown, status: number) {
  return Response.json(body, { status });
}

/**
 * Lee la cookie de sesión de Auth.js para sacar el id_token de Google.
 *
 * El nombre de la cookie cambia según si se sirve por HTTPS
 * (`__Secure-authjs.session-token`) o no (`authjs.session-token`), así que se
 * prueban las dos variantes empezando por la que corresponde al protocolo.
 */
async function readSessionToken(req: NextRequest): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const isHttps = req.nextUrl.protocol === "https:";
  for (const secureCookie of [isHttps, !isHttps]) {
    const token = await getToken({ req, secret, secureCookie });
    if (token) return token;
  }
  return null;
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  if (!BACKEND_URL) {
    return json({ error: "BACKEND_URL no está configurado en el frontend" }, 500);
  }

  const session = await auth();
  if (!session?.user) {
    return json({ error: "No autenticado" }, 401);
  }

  const { path } = await ctx.params;
  const target = (path ?? []).join("/");
  if (!isAllowed(target)) {
    return json({ error: `Ruta no permitida por el proxy: /${target}` }, 403);
  }

  const token = await readSessionToken(req);
  if (!token?.idToken) {
    return json(
      {
        error: "La sesión no tiene un id_token de Google válido. Vuelve a iniciar sesión.",
        detalle: token?.error,
      },
      401,
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.idToken}`,
    Accept: "application/json",
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  // GET y HEAD no llevan cuerpo; el resto se reenvía tal cual.
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${BACKEND_URL}/${target}${req.nextUrl.search}`, {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.error(`Error llamando al backend ${req.method} /${target}:`, err);
    return json({ error: "No se pudo contactar con el backend" }, 502);
  }

  // 204 y 304 no pueden llevar cuerpo: construir la respuesta con uno lanza.
  if (upstream.status === 204 || upstream.status === 304) {
    return new Response(null, { status: upstream.status });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
