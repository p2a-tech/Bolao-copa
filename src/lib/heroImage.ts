import fs from "node:fs";
import path from "node:path";

/**
 * Hero player cutouts for the live match screen (public/teams/<code>.png).
 *
 * Prompts use real star names + official national-team kits (crest + kit brand),
 * chroma-green backdrop, then sharp removes the background.
 *
 * Regenerate: npm run images:hero:force
 */

export const HERO_DIR = path.join(process.cwd(), "public", "teams");
export const HERO_IMAGE_SIZE = "1024x1536" as const;
export const HERO_CHROMA_GREEN = "#00FF00";
export const HERO_CACHE_VERSION = "5";

export function heroImageFile(code: string): string {
  return path.join(HERO_DIR, `${code.toLowerCase()}.png`);
}

export function heroImageUrl(code: string): string | null {
  const c = code.toLowerCase();
  try {
    return fs.existsSync(heroImageFile(c))
      ? `/teams/${c}.png?v=${HERO_CACHE_VERSION}`
      : null;
  } catch {
    return null;
  }
}

/** Craque exibido na UI e usado no prompt principal da API. */
export const TEAM_HERO_PLAYERS: Record<string, string> = {
  mx: "Raúl Jiménez",
  za: "Percy Tau",
  kr: "Son Heung-min",
  cz: "Patrik Schick",
  ca: "Alphonso Davies",
  ba: "Edin Džeko",
  qa: "Almoez Ali",
  ch: "Granit Xhaka",
  br: "Vinícius Júnior",
  ma: "Achraf Hakimi",
  ht: "Duckens Nazon",
  "gb-sct": "Andy Robertson",
  us: "Christian Pulisic",
  py: "Miguel Almirón",
  au: "Harry Souttar",
  tr: "Hakan Çalhanoğlu",
  de: "Jamal Musiala",
  cw: "Leandro Bacuna",
  ci: "Sébastien Haller",
  ec: "Enner Valencia",
  nl: "Virgil van Dijk",
  jp: "Takefusa Kubo",
  se: "Alexander Isak",
  tn: "Youssef Msakni",
  be: "Kevin De Bruyne",
  eg: "Mohamed Salah",
  ir: "Sardar Azmoun",
  nz: "Chris Wood",
  es: "Pedri",
  cv: "Ryan Mendes",
  sa: "Salem Al-Dawsari",
  uy: "Federico Valverde",
  fr: "Kylian Mbappé",
  sn: "Sadio Mané",
  iq: "Mohanad Ali",
  no: "Erling Haaland",
  ar: "Lionel Messi",
  dz: "Riyad Mahrez",
  at: "David Alaba",
  jo: "Musa Al-Taamari",
  pt: "Cristiano Ronaldo",
  cd: "Cédric Bakambu",
  uz: "Eldor Shomurodov",
  co: "Luis Díaz",
  "gb-eng": "Harry Kane",
  hr: "Luka Modrić",
  gh: "Mohammed Kudus",
  pa: "Adalberto Carrasquilla",
};

/** Número clássico do craque (opcional no prompt). */
export const TEAM_HERO_NUMBERS: Record<string, number> = {
  mx: 11,
  kr: 7,
  br: 7,
  ar: 10,
  pt: 7,
  fr: 10,
  hr: 10,
  de: 10,
  be: 7,
  nl: 4,
  eg: 10,
  no: 9,
  "gb-eng": 9,
  es: 8,
  uy: 15,
  co: 10,
  us: 10,
};

/** Fornecedor oficial do uniforme titular (Copa do Mundo). */
export const TEAM_KIT_BRAND: Record<string, string> = {
  mx: "Adidas",
  za: "Adidas",
  kr: "Nike",
  cz: "Adidas",
  ca: "Nike",
  ba: "Macron",
  qa: "Adidas",
  ch: "Puma",
  br: "Adidas",
  ma: "Puma",
  ht: "Nike",
  "gb-sct": "Adidas",
  us: "Nike",
  py: "Adidas",
  au: "Nike",
  tr: "Puma",
  de: "Adidas",
  cw: "Nike",
  ci: "Puma",
  ec: "Marathon",
  nl: "Nike",
  jp: "Adidas",
  se: "Adidas",
  tn: "Kappa",
  be: "Adidas",
  eg: "Adidas",
  ir: "Majid",
  nz: "Nike",
  es: "Adidas",
  cv: "Macron",
  sa: "Nike",
  uy: "Puma",
  fr: "Nike",
  sn: "Puma",
  iq: "Jako",
  no: "Nike",
  ar: "Adidas",
  dz: "Adidas",
  at: "Puma",
  jo: "Nike",
  pt: "Nike",
  cd: "Le Coq Sportif",
  uz: "Adidas",
  co: "Adidas",
  "gb-eng": "Nike",
  hr: "Nike",
  gh: "Puma",
  pa: "Nike",
};

export const OFFICIAL_HOME_KITS: Record<string, string> = {
  mx: "Mexico official home kit: rich green Adidas jersey, Mexico Football Federation crest on chest, Adidas three stripes and logo, white shorts",
  za: "South Africa official home kit: gold-yellow Adidas jersey with green details, SAFA crest, green shorts",
  kr: "South Korea official home kit: red Nike jersey, KFA crest, Nike swoosh, navy shorts",
  cz: "Czechia official home kit: red Adidas jersey with white collar, FAČR crest, white shorts",
  ca: "Canada official home kit: all-red Nike jersey, Canada Soccer crest, red shorts",
  ba: "Bosnia official home kit: blue jersey with yellow panels, federation crest, white shorts",
  qa: "Qatar official home kit: maroon Adidas jersey, QFA crest, white shorts",
  ch: "Switzerland official home kit: red jersey with white cross chest band, SFV crest, white shorts",
  br: "Brazil official home kit: canary-yellow Adidas jersey with green trim, CBF crest, blue shorts",
  ma: "Morocco official home kit: red Puma jersey with green trim, FRMF crest, white shorts",
  ht: "Haiti official home kit: blue Nike jersey with red accents, federation crest, red shorts",
  "gb-sct":
    "Scotland official home kit: navy Adidas jersey, SFA crest, white shorts",
  us: "USA official home kit: white Nike jersey with navy/red details, US Soccer crest, navy shorts",
  py: "Paraguay official home kit: red-and-white vertical striped Adidas jersey, APF crest, blue shorts",
  au: "Australia official home kit: gold-yellow Nike jersey, Football Australia crest, green shorts",
  tr: "Turkey official home kit: red Puma jersey, TFF crest, white shorts",
  de: "Germany official home kit: white Adidas jersey with black shoulder stripes, DFB crest, black shorts",
  cw: "Curaçao official home kit: blue Nike jersey with orange trim, federation crest",
  ci: "Ivory Coast official home kit: orange Puma jersey, FIF crest, white shorts",
  ec: "Ecuador official home kit: yellow Marathon jersey with blue trim, FEF crest, blue shorts",
  nl: "Netherlands official home kit: bright orange Nike jersey, KNVB crest, white shorts",
  jp: "Japan official home kit: blue Adidas samurai jersey with wave motif, JFA crest, white shorts",
  se: "Sweden official home kit: yellow Adidas jersey with blue details, SvFF crest, blue shorts",
  tn: "Tunisia official home kit: white Kappa jersey with red trim, FTF crest, red shorts",
  be: "Belgium official home kit: red Adidas jersey with black trim, RBFA crest, black shorts",
  eg: "Egypt official home kit: red Adidas jersey, EFA crest, white shorts",
  ir: "Iran official home kit: white jersey with green/red trim, IFF crest",
  nz: "New Zealand official home kit: all-white Nike jersey, NZ Football crest, black trim",
  es: "Spain official home kit: red Adidas jersey (La Roja), RFEF crest, navy shorts",
  cv: "Cape Verde official home kit: blue jersey with red/green sash, FCF crest",
  sa: "Saudi Arabia official home kit: white Nike jersey with green trim, SAFF crest",
  uy: "Uruguay official home kit: sky-blue celeste Puma jersey, AUF crest, black shorts",
  fr: "France official home kit: royal-blue Nike jersey, FFF crest, white shorts",
  sn: "Senegal official home kit: white Puma jersey with green trim, FSF crest",
  iq: "Iraq official home kit: white jersey with green accents, IFA crest",
  no: "Norway official home kit: red Nike jersey, NFF crest, white shorts",
  ar: "Argentina official home kit: sky-blue and white vertical stripes Adidas jersey, AFA crest, black shorts",
  dz: "Algeria official home kit: white Adidas jersey with green trim, FAF crest, green shorts",
  at: "Austria official home kit: red Puma jersey, ÖFB crest, white shorts",
  jo: "Jordan official home kit: red Nike jersey, JFA crest, black shorts",
  pt: "Portugal official home kit: burgundy-red Nike jersey, FPF crest, green shorts",
  cd: "DR Congo official home kit: blue jersey with yellow trim, FECOFA crest",
  uz: "Uzbekistan official home kit: white Adidas jersey with blue pattern, UFF crest",
  co: "Colombia official home kit: yellow Adidas jersey with blue panels, FCF crest, blue shorts",
  "gb-eng":
    "England official home kit: white Nike jersey with navy trim, Three Lions crest, navy shorts",
  hr: "Croatia official home kit: iconic red-and-white Nike checkerboard šahovnica jersey, HNS crest, white shorts",
  gh: "Ghana official home kit: white Puma jersey with black star bands, GFA crest, black shorts",
  pa: "Panama official home kit: red Nike jersey with navy panels, FEPAFUT crest, navy shorts",
};

/** @deprecated */
export const KIT_COLORS = OFFICIAL_HOME_KITS;

export const TEAM_HERO_ARCHETYPES: Record<string, string> = {
  mx: "Raúl Jiménez, tall Mexican striker with beard",
  za: "Percy Tau, South African winger",
  kr: "Son Heung-min, South Korean forward",
  cz: "Patrik Schick, Czech striker",
  ca: "Alphonso Davies, Canadian full-back",
  ba: "Edin Džeko, Bosnian striker",
  qa: "Almoez Ali, Qatari forward",
  ch: "Granit Xhaka, Swiss midfielder",
  br: "Vinícius Júnior, Brazilian winger",
  ma: "Achraf Hakimi, Moroccan full-back",
  ht: "Duckens Nazon, Haitian forward",
  "gb-sct": "Andy Robertson, Scottish full-back",
  us: "Christian Pulisic, USA winger",
  py: "Miguel Almirón, Paraguayan playmaker",
  au: "Harry Souttar, Australian defender",
  tr: "Hakan Çalhanoğlu, Turkish midfielder",
  de: "Jamal Musiala, German playmaker",
  cw: "Leandro Bacuna, Curaçao midfielder",
  ci: "Sébastien Haller, Ivorian striker",
  ec: "Enner Valencia, Ecuador forward",
  nl: "Virgil van Dijk, Dutch defender",
  jp: "Takefusa Kubo, Japanese winger",
  se: "Alexander Isak, Swedish striker",
  tn: "Youssef Msakni, Tunisian midfielder",
  be: "Kevin De Bruyne, Belgian playmaker",
  eg: "Mohamed Salah, Egyptian forward",
  ir: "Sardar Azmoun, Iranian striker",
  nz: "Chris Wood, New Zealand striker",
  es: "Pedri, Spanish midfielder",
  cv: "Ryan Mendes, Cape Verde winger",
  sa: "Salem Al-Dawsari, Saudi winger",
  uy: "Federico Valverde, Uruguayan midfielder",
  fr: "Kylian Mbappé, French forward",
  sn: "Sadio Mané, Senegalese winger",
  iq: "Mohanad Ali, Iraqi forward",
  no: "Erling Haaland, Norwegian striker",
  ar: "Lionel Messi, Argentine playmaker",
  dz: "Riyad Mahrez, Algerian winger",
  at: "David Alaba, Austrian defender",
  jo: "Musa Al-Taamari, Jordan winger",
  pt: "Cristiano Ronaldo, Portuguese forward",
  cd: "Cédric Bakambu, Congolese striker",
  uz: "Eldor Shomurodov, Uzbek striker",
  co: "Luis Díaz, Colombian winger",
  "gb-eng": "Harry Kane, English striker",
  hr: "Luka Modrić, Croatian midfielder",
  gh: "Mohammed Kudus, Ghana winger",
  pa: "Adalberto Carrasquilla, Panamanian midfielder",
};

const CAPTAINS = new Set([
  "mx",
  "ar",
  "pt",
  "hr",
  "be",
  "fr",
  "gb-eng",
  "es",
  "uy",
  "sn",
  "eg",
  "us",
  "kr",
  "jp",
]);

function cutoutSuffix(): string {
  return [
    "TV broadcast hero shot: tight crop from the waist up only — head, arms, torso",
    "and top of shorts visible; nothing below the waistline, no legs, no knees, no feet.",
    "Athlete fills about 85% of the frame height; centered mass, slight 3/4 turn",
    "toward the right, confident match-day pose, bright even lighting on face and kit.",
    "Vertical portrait 2:3 aspect ratio matching a flank overlay on a live scoreboard UI.",
    `Flat solid chroma-green background (${HERO_CHROMA_GREEN}) only for cutout —`,
    "no stadium, no crowd, no floor, no props.",
    "Photorealistic, sharp edges, high detail.",
  ].join(" ");
}

export function heroPlayerName(code: string, teamName: string): string {
  return TEAM_HERO_PLAYERS[code.toLowerCase()] ?? teamName;
}

function officialKit(code: string, teamName: string): string {
  const c = code.toLowerCase();
  const brand = TEAM_KIT_BRAND[c] ?? "official";
  const kit =
    OFFICIAL_HOME_KITS[c] ??
    `${teamName} official ${brand} home national team kit with federation crest`;
  const num = TEAM_HERO_NUMBERS[c];
  const numberBit =
    num != null
      ? `, large white number ${num} on the front of the jersey`
      : "";
  const captainBit = CAPTAINS.has(c)
    ? ", FIFA-style captain armband on left arm"
    : "";
  return `${kit}${numberBit}${captainBit}`;
}

const OFFICIAL_KIT_RULES = [
  "Must look like the real FIFA World Cup national-team uniform:",
  "correct federation crest embroidered on chest, correct kit manufacturer logo",
  "(Adidas three stripes/logo or Nike swoosh as specified), authentic colors and pattern.",
  "No invented kit design. No generic plain shirt.",
].join(" ");

/** Prompt principal: craque real + uniforme oficial (como no exemplo GPT). */
export function buildHeroPrompt(teamName: string, code: string): string {
  const c = code.toLowerCase();
  const player = heroPlayerName(c, teamName);
  const kit = officialKit(c, teamName);
  return [
    `Photorealistic cutout of ${player}, ${teamName} national football team star,`,
    `wearing the ${kit}.`,
    OFFICIAL_KIT_RULES,
    cutoutSuffix(),
  ].join(" ");
}

/** Se a moderação bloquear o nome, tenta descrição explícita do craque. */
export function buildHeroPromptArchetype(teamName: string, code: string): string {
  const c = code.toLowerCase();
  const who =
    TEAM_HERO_ARCHETYPES[c] ??
    `the biggest current star of ${teamName}`;
  const kit = officialKit(c, teamName);
  return [
    `Photorealistic cutout of ${who},`,
    `${teamName} national team, wearing the ${kit}.`,
    OFFICIAL_KIT_RULES,
    cutoutSuffix(),
  ].join(" ");
}

/** Último recurso — jogador genérico, mas uniforme oficial correto. */
export function buildHeroPromptFallback(teamName: string, code: string): string {
  const kit = officialKit(code, teamName);
  return [
    `Photorealistic cutout of a professional male footballer for ${teamName},`,
    `wearing the ${kit}.`,
    OFFICIAL_KIT_RULES,
    cutoutSuffix(),
  ].join(" ");
}

export function isModerationBlocked(status: number, body: string): boolean {
  if (status !== 400) return false;
  return (
    body.includes("moderation_blocked") ||
    body.includes("safety system") ||
    body.includes("content_policy")
  );
}
