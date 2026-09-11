/** Formas que devuelve la API de configuración del backend. */

export type Role = "owner" | "editor" | "viewer";
export type RuleKind = "project_rules" | "scope_override";

/**
 * Ajustes de revisión. Una clave ausente significa "hereda": del servidor si es
 * un proyecto, y de las variables de entorno del backend si es un servidor.
 */
export type ReviewConfig = {
  inline_severities?: ("LEVE" | "MEDIA" | "ALTA" | "CRITICA")[];
  max_inline_comments?: number;
  max_diff_chars?: number;
  max_file_diff_chars?: number;
  max_files?: number;
  ignore_globs?: string[];
  max_extra_context_chars?: number;
  review_language?: string;
  max_function_params?: number;
  openai_model?: string;
  openai_temperature?: number;
  openai_reasoning_effort?:
    | "none"
    | "minimal"
    | "low"
    | "medium"
    | "high"
    | "xhigh"
    | "max";
  trigger_on_assign?: boolean;
  trigger_on_reviewer?: boolean;
  trigger_on_mention?: boolean;
  trigger_command?: string;
  unassign_after_review?: boolean;
};

export type Server = {
  id: string;
  name: string;
  gitlab_url: string;
  bot_user_id: number;
  bot_username: string;
  verify_ssl: boolean;
  review_config: ReviewConfig;
  auto_register_projects: boolean;
  enabled: boolean;
  has_gitlab_token: boolean;
  gitlab_token_hint: string;
  has_openai_api_key: boolean;
  openai_api_key_hint: string;
  webhook_secret_hint: string;
  role: Role | null;
};

export type Project = {
  id: string;
  server_id: string;
  gitlab_project_id: number;
  name: string;
  path_with_namespace: string;
  enabled: boolean;
  review_config: ReviewConfig;
};

export type Rule = {
  id: string;
  server_id: string;
  project_id: string | null;
  kind: RuleKind;
  title: string;
  content_md: string;
  enabled: boolean;
};

export type ExtraContext = {
  id: string;
  pattern: string;
  repo_path: string;
  enabled: boolean;
  project_id: string | null;
};

export type Member = {
  email: string;
  role: Role;
  /** false = invitado que todavía no ha iniciado sesión nunca. */
  linked: boolean;
};

/** Lo que devuelve `GET /api/servers`: el árbol de navegación. */
export type ServerWithProjects = Server & {
  projects: Project[];
  /**
   * true cuando el backend no mandó `projects` (versión anterior a que el
   * listado los incluyera). Se distingue de "no tiene proyectos" para no
   * afirmar en la interfaz un cero que no sabemos.
   */
  projectsUnknown?: boolean;
};

export type ServerDetail = Server & {
  projects: Project[];
  rules: Rule[];
  extra_context: ExtraContext[];
  members: Member[];
};

export type ConnectionTest = {
  ok: boolean;
  username?: string;
  user_id?: number;
  warning?: string | null;
  error?: string;
};

/**
 * Deja el detalle de un servidor con todas sus listas presentes.
 *
 * Frontend y backend se despliegan por separado, así que en cualquier momento
 * uno puede ir por delante del otro. Que falte una lista tiene que degradar la
 * vista, no tumbar la página con un "Cannot read properties of undefined".
 */
export function normalizeServerDetail(s: ServerDetail): ServerDetail {
  return {
    ...s,
    projects: Array.isArray(s.projects) ? s.projects : [],
    rules: Array.isArray(s.rules) ? s.rules : [],
    extra_context: Array.isArray(s.extra_context) ? s.extra_context : [],
    members: Array.isArray(s.members) ? s.members : [],
  };
}

/** Quién puede escribir. `viewer` solo mira. */
export function canEdit(role: Role | null): boolean {
  return role === "owner" || role === "editor";
}

export function isOwner(role: Role | null): boolean {
  return role === "owner";
}
