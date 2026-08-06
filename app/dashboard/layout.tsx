import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { TreeProvider } from "@/components/tree-context";

/**
 * Esqueleto del panel: barra superior fija, árbol de navegación a la izquierda y
 * el contenido a la derecha. La comprobación de sesión vive aquí y no en cada
 * página, así que una ruta nueva del panel queda protegida por defecto.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const { name, email, image } = session.user;

  return (
    <TreeProvider>
      <div className="app">
        <header className="topbar">
          <span className="topbar__marca">AI Reviewer</span>

          {session.error ? (
            <span className="topbar__aviso">
              Sesión de Google sin renovar ({session.error}) — vuelve a entrar
            </span>
          ) : null}

          <div className="topbar__usuario">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar externo de Google
              <img className="avatar" src={image} alt="" />
            ) : null}
            <span className="topbar__correo" title={email ?? ""}>
              {name ?? email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit">Salir</button>
            </form>
          </div>
        </header>

        <div className="app__body">
          <Sidebar />
          <main className="app__content">{children}</main>
        </div>
      </div>
    </TreeProvider>
  );
}
