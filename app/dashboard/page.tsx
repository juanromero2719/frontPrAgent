import HealthCheck from "./health-check";
import Home from "./home";

export default function DashboardPage() {
  return (
    <>
      <Home />

      <details className="diagnostico">
        <summary>Diagnóstico de la conexión con el backend</summary>
        <HealthCheck />
      </details>
    </>
  );
}
