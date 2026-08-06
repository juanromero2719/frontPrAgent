import { Suspense } from "react";

import ServerWorkspace from "./server-workspace";

export default async function ServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // El módulo abierto se lee de la query con useSearchParams, que exige un
  // límite de Suspense por encima.
  return (
    <Suspense fallback={<p className="muted">Cargando…</p>}>
      <ServerWorkspace serverId={id} />
    </Suspense>
  );
}
