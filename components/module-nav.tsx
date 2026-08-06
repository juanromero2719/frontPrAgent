"use client";

/**
 * Navegación por módulos.
 *
 * Dos formas de lo mismo: una rejilla de tarjetas que explica para qué sirve cada
 * módulo (la portada de un servidor o proyecto) y una barra compacta para saltar
 * entre ellos una vez dentro. El módulo abierto va en la URL (`?m=`), así que
 * recargar o compartir el enlace te deja en el mismo sitio.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type Modulo = {
  id: string;
  titulo: string;
  /** Para qué sirve. Es lo que se lee en la tarjeta antes de entrar. */
  para: string;
  icono: string;
  /** Estado actual, en una línea. Ej.: "2 de 3 activos". */
  estado?: string;
  /** Marca los módulos que pueden dejar el bot sin funcionar. */
  cuidado?: boolean;
};

/** Lee y escribe el módulo abierto en la URL. */
export function useModulo(): [string | null, (id: string | null) => void] {
  const router = useRouter();
  const params = useSearchParams();
  const actual = params.get("m");

  const set = useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (id) next.set("m", id);
      else next.delete("m");
      const qs = next.toString();
      // replace y no push: el historial se llena de basura si cada pestaña que
      // miras deja una entrada, y el botón "atrás" debería sacarte del servidor.
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [params, router],
  );

  return [actual, set];
}

export function ModuleGrid({
  modulos,
  onAbrir,
}: {
  modulos: Modulo[];
  onAbrir: (id: string) => void;
}) {
  return (
    <div className="modulos">
      {modulos.map((m) => (
        <button
          key={m.id}
          className={m.cuidado ? "modulo modulo--cuidado" : "modulo"}
          onClick={() => onAbrir(m.id)}
        >
          <span className="modulo__icono" aria-hidden="true">
            {m.icono}
          </span>
          <span className="modulo__titulo">{m.titulo}</span>
          <span className="modulo__para">{m.para}</span>
          {m.estado ? <span className="modulo__estado">{m.estado}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ModuleTabs({
  modulos,
  actual,
  onCambiar,
}: {
  modulos: Modulo[];
  actual: string;
  onCambiar: (id: string | null) => void;
}) {
  return (
    <div className="tabs" role="tablist">
      <button className="tabs__volver" onClick={() => onCambiar(null)} title="Ver todos los módulos">
        ⊞
      </button>
      {modulos.map((m) => (
        <button
          key={m.id}
          role="tab"
          aria-selected={m.id === actual}
          className={m.id === actual ? "tab is-active" : "tab"}
          onClick={() => onCambiar(m.id)}
        >
          <span aria-hidden="true">{m.icono}</span> {m.titulo}
        </button>
      ))}
    </div>
  );
}
