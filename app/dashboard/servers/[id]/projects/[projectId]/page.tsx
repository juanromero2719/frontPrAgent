import { Suspense } from "react";

import ProjectWorkspace from "./project-workspace";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; projectId: string }>;
}) {
  const { id, projectId } = await params;

  return (
    <Suspense fallback={<p className="muted">Cargando…</p>}>
      <ProjectWorkspace serverId={id} projectId={projectId} />
    </Suspense>
  );
}
