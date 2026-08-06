// Campos propios que añadimos a la sesión y al JWT de Auth.js.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** Presente si falló la renovación del token de Google. */
    error?: string;
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** id_token de Google. Solo se lee en el servidor. */
    idToken?: string;
    refreshToken?: string;
    /** Caducidad del token de Google, en segundos epoch. */
    expiresAt?: number;
    error?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
