type Sponsor = {
  name: string;
  logoUrl: string;
  linkUrl?: string | null;
};

export function SponsorBanner({
  sponsor,
  label = "Patrocínio",
  className = "",
}: {
  sponsor: Sponsor | null | undefined;
  label?: string;
  className?: string;
}) {
  if (!sponsor) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-100 px-4 py-3 text-xs uppercase tracking-wide text-slate-400 ${className}`}
      >
        Espaço para patrocinador
      </div>
    );
  }

  const content = (
    <img
      src={sponsor.logoUrl}
      alt={sponsor.name}
      className="max-h-full max-w-full object-contain"
    />
  );

  return (
    <div className={`relative ${className}`}>
      <span className="absolute -top-2 left-3 rounded bg-white px-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 ring-1 ring-slate-200">
        {label}
      </span>
      <div className="flex h-full items-center justify-center overflow-hidden rounded-lg bg-white p-3 ring-1 ring-slate-200">
        {sponsor.linkUrl ? (
          <a
            href={sponsor.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full w-full items-center justify-center"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
