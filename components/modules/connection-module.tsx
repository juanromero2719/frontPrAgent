"use client";

import { useState } from "react";

import { api } from "@/lib/api";
import type { ConnectionTest, ServerDetail } from "@/lib/types";
import { ActionButton, Banner, Field } from "@/components/ui";

/** Con qué credenciales habla el bot con este GitLab. */
export function ConnectionModule({
  server,
  editable,
  onChanged,
}: {
  server: ServerDetail;
  editable: boolean;
  onChanged: () => void;
}) {
  const [name, setName] = useState(server.name);
  const [gitlabUrl, setGitlabUrl] = useState(server.gitlab_url);
  const [botUserId, setBotUserId] = useState(String(server.bot_user_id));
  const [botUsername, setBotUsername] = useState(server.bot_username);
  const [verifySsl, setVerifySsl] = useState(server.verify_ssl);
  const [autoRegister, setAutoRegister] = useState(server.auto_register_projects);
  const [enabled, setEnabled] = useState(server.enabled);
  // Los secretos arrancan vacíos: el backend no los devuelve, así que enviar el
  // campo vacío significaría borrarlos. Solo se manda lo que se teclee.
  const [token, setToken] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [prueba, setPrueba] = useState<ConnectionTest | null>(null);

  return (
    <>
      {error ? (
        <Banner kind="error" onClose={() => setError(null)}>
          {error}
        </Banner>
      ) : null}
      {guardado ? (
        <Banner kind="ok" onClose={() => setGuardado(false)}>
          Guardado.
        </Banner>
      ) : null}

      <div className="grid">
        <Field label="Nombre">
          <input value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="URL de GitLab" hint="Sin barra final">
          <input
            value={gitlabUrl}
            disabled={!editable}
            onChange={(e) => setGitlabUrl(e.target.value)}
          />
        </Field>
        <Field
          label="Token del bot"
          hint={
            server.has_gitlab_token
              ? `Guardado (${server.gitlab_token_hint}). Escribe uno nuevo para reemplazarlo.`
              : "Sin token: el bot no puede leer ni comentar."
          }
        >
          <input
            type="password"
            value={token}
            disabled={!editable}
            placeholder={server.has_gitlab_token ? "sin cambios" : "glpat-…"}
            onChange={(e) => setToken(e.target.value)}
          />
        </Field>
        <Field
          label="API key de OpenAI"
          hint={
            server.has_openai_api_key
              ? `Guardada (${server.openai_api_key_hint}). Vacío = sin cambios.`
              : "Vacío = se usa la del backend."
          }
        >
          <input
            type="password"
            value={openaiKey}
            disabled={!editable}
            placeholder={server.has_openai_api_key ? "sin cambios" : "sk-…"}
            onChange={(e) => setOpenaiKey(e.target.value)}
          />
        </Field>
        <Field label="ID del usuario bot" hint="GET /api/v4/user con su token">
          <input
            type="number"
            value={botUserId}
            disabled={!editable}
            onChange={(e) => setBotUserId(e.target.value)}
          />
        </Field>
        <Field label="Usuario del bot" hint="Sin la @">
          <input
            value={botUsername}
            disabled={!editable}
            onChange={(e) => setBotUsername(e.target.value)}
          />
        </Field>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={verifySsl}
          disabled={!editable}
          onChange={(e) => setVerifySsl(e.target.checked)}
        />
        Verificar el certificado TLS
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={autoRegister}
          disabled={!editable}
          onChange={(e) => setAutoRegister(e.target.checked)}
        />
        Dar de alta solos (desactivados) los proyectos desconocidos que manden webhooks
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={enabled}
          disabled={!editable}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Servidor activo — si lo desactivas, no se revisa ningún proyecto suyo
      </label>

      <div className="row">
        {editable ? (
          <ActionButton
            primary
            onError={setError}
            onAction={async () => {
              const cambios: Record<string, unknown> = {
                name,
                gitlab_url: gitlabUrl.replace(/\/+$/, ""),
                bot_user_id: Number(botUserId) || 0,
                bot_username: botUsername,
                verify_ssl: verifySsl,
                auto_register_projects: autoRegister,
                enabled,
              };
              if (token.trim()) cambios.gitlab_token = token.trim();
              if (openaiKey.trim()) cambios.openai_api_key = openaiKey.trim();

              await api.patch(`/api/servers/${server.id}`, cambios);
              setToken("");
              setOpenaiKey("");
              setGuardado(true);
              onChanged();
            }}
          >
            Guardar
          </ActionButton>
        ) : null}

        <ActionButton
          onError={setError}
          onAction={async () => {
            setPrueba(await api.post<ConnectionTest>(`/api/servers/${server.id}/test`));
          }}
        >
          Probar conexión
        </ActionButton>
      </div>

      {prueba ? (
        prueba.ok ? (
          <Banner kind="ok" onClose={() => setPrueba(null)}>
            Conectado como @{prueba.username} (id {prueba.user_id}).
            {prueba.warning ? ` Aviso: ${prueba.warning}` : ""}
          </Banner>
        ) : (
          <Banner kind="error" onClose={() => setPrueba(null)}>
            {prueba.error}
          </Banner>
        )
      ) : null}
    </>
  );
}
