/** Vídeo de fundo do topo da home: YouTube, Vimeo ou arquivo .mp4/.webm. */
export type VideoFundo = { tipo: "iframe"; src: string } | { tipo: "arquivo"; src: string } | null;

export function videoDeFundo(url: string): VideoFundo {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");

  let youtube: string | null = null;
  if (host === "youtu.be") youtube = u.pathname.slice(1);
  if (host === "youtube.com" || host === "m.youtube.com") youtube = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
  if (youtube && /^[\w-]{6,20}$/.test(youtube)) {
    // youtube-nocookie: não grava cookie de publicidade no visitante.
    return { tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&mute=1&loop=1&playlist=${youtube}&controls=0&playsinline=1&modestbranding=1&rel=0` };
  }

  const vimeo = host === "vimeo.com" ? u.pathname.match(/^\/(\d+)/)?.[1] : host === "player.vimeo.com" ? u.pathname.match(/\/video\/(\d+)/)?.[1] : null;
  if (vimeo) return { tipo: "iframe", src: `https://player.vimeo.com/video/${vimeo}?background=1&autoplay=1&loop=1&muted=1&dnt=1` };

  if (/\.(mp4|webm)$/i.test(u.pathname)) return { tipo: "arquivo", src: u.toString() };
  return null;
}
