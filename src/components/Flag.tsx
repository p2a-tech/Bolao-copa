import { flagClass } from "@/lib/flags";

export function Flag({
  code,
  name,
  width = 48,
}: {
  code: string;
  name?: string;
  width?: number;
}) {
  const height = Math.round((width * 3) / 4);
  return (
    <span
      className={`${flagClass(code)} inline-block rounded-md bg-slate-100 shadow-sm ring-1 ring-black/10`}
      role="img"
      aria-label={name ? `Bandeira: ${name}` : `Bandeira ${code}`}
      style={{
        width,
        height,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
