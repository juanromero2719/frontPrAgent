import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

/**
 * Pide a Google un `id_token` nuevo con el refresh_token guardado.
 *
 * El id_token de Google vive 1 hora. Sin esto, el dashboard dejaría de poder
 * llamar al backend justo una hora después de iniciar sesión, con un 401 que
 * parece un fallo de configuración pero no lo es.
 */
async function refreshIdToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    return { ...token, error: "SinRefreshToken" };
  }

  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID ?? "",
        client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const data = (await res.json()) as {
      id_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!res.ok) {
      throw new Error(data.error_description ?? data.error ?? `HTTP ${res.status}`);
    }

    return {
      ...token,
      idToken: data.id_token ?? token.idToken,
      // Google no siempre devuelve un refresh_token nuevo: se conserva el viejo.
      refreshToken: data.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      error: undefined,
    };
  } catch (err) {
    console.error("No se pudo renovar el id_token de Google:", err);
    // Se devuelve la sesión marcada con error en vez de romperla: la UI puede
    // pedir un nuevo login.
    return { ...token, error: "FalloAlRenovar" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          scope: "openid email profile",
          // Necesarios para recibir un refresh_token de Google.
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      // Primer login: se guardan los tokens de Google en la cookie de sesión
      // (cifrada con AUTH_SECRET, nunca visible desde el navegador).
      if (account) {
        return {
          ...token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
          error: undefined,
        };
      }

      // Un minuto de margen para no mandar al backend un token recién caducado.
      if (token.expiresAt && Date.now() < (token.expiresAt - 60) * 1000) {
        return token;
      }

      return refreshIdToken(token);
    },
    async session({ session, token }) {
      // OJO: el id_token NO se expone aquí a propósito. La sesión sí llega al
      // navegador; el token de Google solo se usa desde el servidor
      // (app/api/backend/[...path]/route.ts).
      session.error = token.error;
      return session;
    },
  },
});
