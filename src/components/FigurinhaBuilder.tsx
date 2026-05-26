"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";

/**
 * Editor de figurinha — template oficial completo (figurinha-template-br.png)
 * + foto do usuário recortada em silhueta (cabeça + corpo). Auto-encaixe
 * inteligente posiciona o rosto da foto no círculo do rosto do template
 * (heurística: rosto está em ~25% do topo da foto).
 */

const TEMPLATE_SRC = "/figurinha-template-br.png";
const EXPORT = { width: 600, height: 840 };
const PREVIEW = { width: 300, height: 420 };

const SILHOUETTE = {
  head: {
    cxRatio: 0.5,
    cyRatio: 0.21,
    rxRatio: 0.13,
    ryRatio: 0.11,
  },
  body: {
    xRatio: 0.18,
    yRatio: 0.3,
    wRatio: 0.64,
    hRatio: 0.55,
    rRatio: 0.06,
  },
};

type Transform = { x: number; y: number; scale: number };

function silhouetteAt(w: number, h: number) {
  return {
    head: {
      cx: w * SILHOUETTE.head.cxRatio,
      cy: h * SILHOUETTE.head.cyRatio,
      rx: w * SILHOUETTE.head.rxRatio,
      ry: h * SILHOUETTE.head.ryRatio,
    },
    body: {
      x: w * SILHOUETTE.body.xRatio,
      y: h * SILHOUETTE.body.yRatio,
      w: w * SILHOUETTE.body.wRatio,
      h: h * SILHOUETTE.body.hRatio,
      r: w * SILHOUETTE.body.rRatio,
    },
  };
}

export function FigurinhaBuilder({
  onConfirm,
}: {
  initialName?: string;
  onConfirm?: (figurinhaUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [photoSrc, setPhotoSrc] = useState<string | null>(null);
  const [photoNatural, setPhotoNatural] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [status, setStatus] = useState<
    "idle" | "composing" | "uploading" | "saved" | "error"
  >("idle");
  const [error, setError] = useState("");

  const previewSil = useMemo(
    () => silhouetteAt(PREVIEW.width, PREVIEW.height),
    []
  );
  const exportSil = useMemo(
    () => silhouetteAt(EXPORT.width, EXPORT.height),
    []
  );

  const previewBox = useMemo(() => {
    const minX = Math.min(
      previewSil.head.cx - previewSil.head.rx,
      previewSil.body.x
    );
    const maxX = Math.max(
      previewSil.head.cx + previewSil.head.rx,
      previewSil.body.x + previewSil.body.w
    );
    const minY = Math.min(
      previewSil.head.cy - previewSil.head.ry,
      previewSil.body.y
    );
    const maxY = Math.max(
      previewSil.head.cy + previewSil.head.ry,
      previewSil.body.y + previewSil.body.h
    );
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [previewSil]);

  /**
   * Auto-encaixe: assume que o rosto da pessoa está em ~25% do topo da
   * foto e horizontalmente centralizado. Escala pra cobrir a silhueta e
   * posiciona o rosto alinhado com o círculo da cabeça do template.
   */
  const autoFit = useCallback(() => {
    if (!photoNatural.w || !photoNatural.h) return;

    const FACE_IN_PHOTO_X = 0.5;
    const FACE_IN_PHOTO_Y = 0.25;

    const targetFaceWidth = previewSil.head.rx * 2 * 1.6;
    let scale = targetFaceWidth / photoNatural.w;

    const minScaleW = previewBox.w / photoNatural.w;
    const minScaleH = previewBox.h / photoNatural.h;
    scale = Math.max(scale, minScaleW, minScaleH);

    const w = photoNatural.w * scale;
    const h = photoNatural.h * scale;
    const x = previewSil.head.cx - FACE_IN_PHOTO_X * w;
    const y = previewSil.head.cy - FACE_IN_PHOTO_Y * h;

    setTransform({ x, y, scale });
  }, [
    photoNatural.w,
    photoNatural.h,
    previewSil.head.cx,
    previewSil.head.cy,
    previewSil.head.rx,
    previewBox.w,
    previewBox.h,
  ]);

  useEffect(() => {
    autoFit();
  }, [autoFit]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("idle");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setPhotoNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setPhotoSrc(url);
    };
    img.onerror = () => setError("Não foi possível ler a imagem.");
    img.src = url;
  }

  // ---------- Drag ----------
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!photoSrc) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: transform.x,
      origY: transform.y,
    };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTransform((t) => ({
      ...t,
      x: dragRef.current!.origX + dx,
      y: dragRef.current!.origY + dy,
    }));
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    if (!photoSrc) return;
    const delta = -e.deltaY * 0.0015;
    setTransform((t) => {
      const newScale = Math.min(5, Math.max(0.2, t.scale + delta));
      return { ...t, scale: newScale };
    });
  }

  function buildSilhouettePath(): Path2D {
    const path = new Path2D();
    path.ellipse(
      exportSil.head.cx,
      exportSil.head.cy,
      exportSil.head.rx,
      exportSil.head.ry,
      0,
      0,
      Math.PI * 2
    );
    const b = exportSil.body;
    const r = b.r;
    path.moveTo(b.x + r, b.y);
    path.lineTo(b.x + b.w - r, b.y);
    path.quadraticCurveTo(b.x + b.w, b.y, b.x + b.w, b.y + r);
    path.lineTo(b.x + b.w, b.y + b.h - r);
    path.quadraticCurveTo(b.x + b.w, b.y + b.h, b.x + b.w - r, b.y + b.h);
    path.lineTo(b.x + r, b.y + b.h);
    path.quadraticCurveTo(b.x, b.y + b.h, b.x, b.y + b.h - r);
    path.lineTo(b.x, b.y + r);
    path.quadraticCurveTo(b.x, b.y, b.x + r, b.y);
    path.closePath();
    return path;
  }

  const composeBlob = useCallback(async (): Promise<Blob> => {
    if (!photoSrc) throw new Error("Sem foto");
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT.width;
    canvas.height = EXPORT.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas não suportado");

    const tpl = new Image();
    tpl.crossOrigin = "anonymous";
    tpl.src = TEMPLATE_SRC;
    await tpl.decode();
    ctx.drawImage(tpl, 0, 0, EXPORT.width, EXPORT.height);

    const scaleToExport = EXPORT.width / PREVIEW.width;
    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    photoImg.src = photoSrc;
    await photoImg.decode();

    ctx.save();
    ctx.clip(buildSilhouettePath());
    const drawW = photoNatural.w * transform.scale * scaleToExport;
    const drawH = photoNatural.h * transform.scale * scaleToExport;
    const drawX = transform.x * scaleToExport;
    const drawY = transform.y * scaleToExport;
    ctx.drawImage(photoImg, drawX, drawY, drawW, drawH);
    ctx.restore();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob falhou"))),
        "image/png"
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    photoSrc,
    photoNatural.w,
    photoNatural.h,
    transform.x,
    transform.y,
    transform.scale,
  ]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    if (!photoSrc || !onConfirm) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const mySeq = ++seqRef.current;
      try {
        setStatus("composing");
        const blob = await composeBlob();
        if (mySeq !== seqRef.current) return;
        setStatus("uploading");
        const fd = new FormData();
        fd.append("file", new File([blob], "figurinha.png", { type: "image/png" }));
        const res = await fetch("/api/auth/upload-photo", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (mySeq !== seqRef.current) return;
        if (!res.ok) {
          setStatus("error");
          setError(json.error || "Falha ao enviar a figurinha.");
          return;
        }
        onConfirm(json.url);
        setStatus("saved");
      } catch (err) {
        if (mySeq !== seqRef.current) return;
        console.error(err);
        setStatus("error");
        setError("Falha ao gerar/enviar a figurinha.");
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [photoSrc, transform.x, transform.y, transform.scale, composeBlob, onConfirm]);

  async function handleDownload() {
    if (!photoSrc) {
      setError("Faça upload de uma foto primeiro.");
      return;
    }
    try {
      const blob = await composeBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "minha-figurinha.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error(err);
      setError("Falha ao gerar a imagem.");
    }
  }

  const statusBadge = (() => {
    if (status === "composing")
      return { text: "Montando figurinha...", color: "text-slate-300" };
    if (status === "uploading")
      return { text: "Enviando...", color: "text-slate-300" };
    if (status === "saved")
      return { text: "✓ Figurinha pronta", color: "text-emerald-400" };
    if (status === "error")
      return { text: error || "Erro", color: "text-red-400" };
    return null;
  })();

  const SVG_CLIP_ID = "figurinha-body-clip";

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-6">
      <div className="flex flex-col items-center gap-3">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onWheel={onWheel}
          className="relative overflow-hidden rounded-xl bg-slate-800 ring-1 ring-white/10"
          style={{
            width: PREVIEW.width,
            height: PREVIEW.height,
            touchAction: "none",
            cursor: photoSrc ? "grab" : "default",
          }}
          aria-label="Pré-visualização da figurinha"
        >
          <svg width="0" height="0" className="absolute" style={{ pointerEvents: "none" }} aria-hidden>
            <defs>
              <clipPath id={SVG_CLIP_ID} clipPathUnits="userSpaceOnUse">
                <ellipse
                  cx={previewSil.head.cx}
                  cy={previewSil.head.cy}
                  rx={previewSil.head.rx}
                  ry={previewSil.head.ry}
                />
                <rect
                  x={previewSil.body.x}
                  y={previewSil.body.y}
                  width={previewSil.body.w}
                  height={previewSil.body.h}
                  rx={previewSil.body.r}
                  ry={previewSil.body.r}
                />
              </clipPath>
            </defs>
          </svg>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={TEMPLATE_SRC}
            alt="Template"
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 1 }}
            draggable={false}
          />

          {photoSrc && (
            <div
              className="absolute inset-0"
              style={{
                zIndex: 2,
                clipPath: `url(#${SVG_CLIP_ID})`,
                WebkitClipPath: `url(#${SVG_CLIP_ID})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoSrc}
                alt="Foto do usuário"
                style={{
                  position: "absolute",
                  left: transform.x,
                  top: transform.y,
                  width: photoNatural.w * transform.scale,
                  height: photoNatural.h * transform.scale,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </div>
          )}

          {!photoSrc && (
            <svg
              viewBox={`0 0 ${PREVIEW.width} ${PREVIEW.height}`}
              className="absolute inset-0 h-full w-full"
              style={{ zIndex: 10, pointerEvents: "none" }}
              aria-hidden
            >
              <g fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeDasharray="6 4">
                <ellipse
                  cx={previewSil.head.cx}
                  cy={previewSil.head.cy}
                  rx={previewSil.head.rx}
                  ry={previewSil.head.ry}
                />
                <rect
                  x={previewSil.body.x}
                  y={previewSil.body.y}
                  width={previewSil.body.w}
                  height={previewSil.body.h}
                  rx={previewSil.body.r}
                  ry={previewSil.body.r}
                />
              </g>
              <text
                x="50%"
                y={previewSil.body.y + previewSil.body.h / 2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.7)"
                fontSize="11"
                fontFamily="sans-serif"
              >
                Sua foto vai aqui
              </text>
            </svg>
          )}
        </div>

        {photoSrc && (
          <div className="flex w-full items-center gap-2 text-xs text-slate-400">
            <span>−</span>
            <input
              type="range"
              min="0.2"
              max="5"
              step="0.01"
              value={transform.scale}
              onChange={(e) =>
                setTransform((t) => ({ ...t, scale: Number(e.target.value) }))
              }
              className="flex-1"
            />
            <span>+</span>
          </div>
        )}

        <p className="max-w-[300px] text-center text-[11px] text-slate-400">
          Use o botão Auto-encaixar pra encaixe automático. Arraste ou use a
          roda do mouse pra ajustar.
        </p>

        {statusBadge && (
          <p className={`text-xs font-semibold ${statusBadge.color}`}>
            {statusBadge.text}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <label className="label">Sua foto</label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {photoSrc ? "📷 Trocar foto" : "📷 Adicionar foto"}
            </button>
            {photoSrc && (
              <>
                <button
                  type="button"
                  onClick={autoFit}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800"
                >
                  ↻ Auto-encaixar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoSrc(null);
                    setPhotoNatural({ w: 0, h: 0 });
                    setStatus("idle");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                >
                  Remover
                </button>
              </>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!photoSrc}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40"
            >
              ⬇️ Baixar PNG
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            No celular abre a câmera. A foto é encaixada automaticamente no
            template (rosto alinhado com o círculo da cabeça). Pode ajustar
            manualmente arrastando e dando zoom.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            capture="user"
            onChange={handleFile}
            className="hidden"
          />
        </div>

        {error && status === "error" && (
          <p className="rounded-lg bg-red-500/12 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
