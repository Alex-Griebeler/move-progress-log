// Autenticação do espelho por assinatura Ed25519 (docs/ESPELHO_WEARABLES.md). O MESMO arquivo vai para
// a exportadora da Fabrik (só verifica) e para o importador do app pessoal (gera o par e assina).
// Nenhum segredo cruza entre os apps: a chave privada nasce e fica no Vault do app pessoal; a Fabrik
// guarda só a chave pública, que não é segredo.
//
// Mensagem assinada: "wearable-mirror-v1.<destino>.<timestamp em segundos>.<corpo exato da requisição>",
// com destino = host + caminho da exportadora (um pedido assinado para outro endereço não vale neste).
// Cabeçalhos: x-wearable-mirror-timestamp e x-wearable-mirror-signature (base64url, 64 bytes).
// Janela de relógio de 5 min: uma requisição capturada só poderia ser repetida dentro dela, e a
// exportação é só leitura sobre TLS.

export const MIRROR_SIGNATURE_VERSION = "wearable-mirror-v1";
export const MIRROR_MAX_CLOCK_SKEW_SECONDS = 300;
export const MIRROR_MAX_SIGNED_BODY_BYTES = 4096;

const ED25519 = { name: "Ed25519" } as const;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  try {
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function signedMessage(audience: string, timestamp: string, body: string): Uint8Array {
  return new TextEncoder().encode(`${MIRROR_SIGNATURE_VERSION}.${audience}.${timestamp}.${body}`);
}

/** Destino que entra na assinatura: host + caminho, sem esquema, query nem barra final. */
export function mirrorAudience(url: string): string {
  const u = new URL(url);
  return `${u.host}${u.pathname.replace(/\/+$/, "")}`;
}

/** Lê o corpo parando em maxBytes (null se passar): chamador sem assinatura não enche a memória. */
export async function readBodyLimited(req: Request, maxBytes = MIRROR_MAX_SIGNED_BODY_BYTES): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > maxBytes) return null;
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Gera o par. privateJwk só vai para o Vault; publicKey (32 bytes, base64url) vai para o código da Fabrik. */
export async function generateMirrorKeyPair(): Promise<{ privateJwk: string; publicKey: string }> {
  const pair = (await crypto.subtle.generateKey(ED25519, true, ["sign", "verify"])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return {
    privateJwk: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x }),
    publicKey: toBase64Url(raw),
  };
}

export async function signMirrorRequest(
  privateJwk: string,
  audience: string,
  body: string,
  nowSeconds: number,
): Promise<{ timestamp: string; signature: string }> {
  const key = await crypto.subtle.importKey("jwk", JSON.parse(privateJwk), ED25519, false, ["sign"]);
  const timestamp = String(Math.floor(nowSeconds));
  const signature = new Uint8Array(await crypto.subtle.sign(ED25519, key, signedMessage(audience, timestamp, body) as BufferSource));
  return { timestamp, signature: toBase64Url(signature) };
}

/** Falso para qualquer entrada malformada, fora da janela ou com assinatura que não confere. Nunca lança. */
export async function verifyMirrorRequest(
  publicKey: string,
  audience: string,
  body: string,
  timestamp: string | null,
  signature: string | null,
  nowSeconds: number,
): Promise<boolean> {
  if (!timestamp || !signature || !/^\d{1,12}$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > MIRROR_MAX_CLOCK_SKEW_SECONDS) return false;
  if (new TextEncoder().encode(body).length > MIRROR_MAX_SIGNED_BODY_BYTES) return false;
  const pub = fromBase64Url(publicKey);
  const sig = fromBase64Url(signature);
  if (!pub || pub.length !== 32 || !sig || sig.length !== 64) return false;
  try {
    const key = await crypto.subtle.importKey("raw", pub as BufferSource, ED25519, false, ["verify"]);
    return await crypto.subtle.verify(ED25519, key, sig as BufferSource, signedMessage(audience, timestamp, body) as BufferSource);
  } catch {
    return false;
  }
}
