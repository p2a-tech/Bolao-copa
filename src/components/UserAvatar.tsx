import { Flag } from "./Flag";

type Size = "sm" | "md" | "lg";

const PX: Record<Size, number> = {
  sm: 40,
  md: 96,
  lg: 200,
};

/** Caminho do template oficial FIFA 26 — Brasil (salvar em public/). */
export const FIGURINHA_TEMPLATE = "/figurinha-template-br.png";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function UserAvatar({
  photoUrl,
  name,
  size = "sm",
}: {
  photoUrl: string | null | undefined;
  name: string;
  size?: Size;
}) {
  if (size === "lg") {
    return <FigurinhaCard photoUrl={photoUrl} name={name} />;
  }

  const px = PX[size];
  const initials = initialsOf(name);

  return (
    <div
      className="relative shrink-0"
      style={{ width: px, height: px }}
      aria-label={`Foto de ${name}`}
    >
      <div
        className="h-full w-full rounded-full p-[2px]"
        style={{
          background:
            "conic-gradient(from 180deg, #009C3B, #FFDF00, #009C3B, #FFDF00, #009C3B)",
        }}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-900 ring-1 ring-black/40">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={`Foto de ${name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              className="font-extrabold text-emerald-300"
              style={{ fontSize: px * 0.35 }}
            >
              {initials}
            </span>
          )}
        </div>
      </div>

      {size === "md" && (
        <span
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 ring-2 ring-slate-900"
          aria-hidden
        >
          <Flag code="BR" name="Brasil" width={18} />
        </span>
      )}
    </div>
  );
}

/**
 * Renderiza o template FIFA 26 Brasil (public/figurinha-template-br.png)
 * como background, sobrepondo a foto do usuário (já sem fundo, recortada
 * via background-removal no upload) e o nome na faixa amarela embaixo.
 */
function FigurinhaCard({
  photoUrl,
  name,
}: {
  photoUrl: string | null | undefined;
  name: string;
}) {
  const initials = initialsOf(name);
  const displayName = (name.split(/\s+/)[0] || name).toUpperCase();

  return (
    <div
      className="relative overflow-hidden rounded-2xl shadow-xl"
      style={{
        width: 200,
        height: 280,
        backgroundImage: `url(${FIGURINHA_TEMPLATE})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#6DD4DC",
        boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
      }}
      aria-label={`Figurinha FIFA 26 — ${name}`}
    >
      <div
        className="absolute"
        style={{
          top: "5%",
          left: "10%",
          right: "10%",
          bottom: "16%",
        }}
      >
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`Foto de ${name}`}
            className="h-full w-full object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.4)]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-lg bg-yellow-300/90 text-4xl font-black text-emerald-800 ring-4 ring-emerald-600"
            aria-hidden
          >
            {initials}
          </div>
        )}
      </div>

      <div className="absolute inset-x-3 bottom-3 z-20">
        <div
          className="rounded-md px-3 py-1.5 text-center shadow-md"
          style={{
            background: "linear-gradient(180deg, #FFE56A 0%, #FFD000 100%)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          }}
        >
          <span className="block truncate text-sm font-black uppercase tracking-wide text-emerald-900">
            {displayName}
          </span>
        </div>
      </div>
    </div>
  );
}
