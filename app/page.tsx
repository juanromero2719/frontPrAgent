import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="center">
      <div className="card card--narrow">
        <h1>AI Reviewer</h1>
        <p className="muted">
          Panel de control del revisor automático de merge requests.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
        >
          <button className="btn--primary" type="submit">
            Continuar con Google
          </button>
        </form>
      </div>
    </main>
  );
}
