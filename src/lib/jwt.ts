// Helper to encode to base64url
function base64urlEncode(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Helper to decode from base64url
function base64urlDecode(str: string): Uint8Array {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function signJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerBase64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadBase64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  
  const tokenInput = `${headerBase64}.${payloadBase64}`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(tokenInput);
  
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const signatureBase64 = base64urlEncode(new Uint8Array(signature));
  
  return `${tokenInput}.${signatureBase64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [headerBase64, payloadBase64, signatureBase64] = parts;
    const tokenInput = `${headerBase64}.${payloadBase64}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(tokenInput);
    
    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = base64urlDecode(signatureBase64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      messageData
    );
    
    if (!isValid) return null;
    
    const payloadBytes = base64urlDecode(payloadBase64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    
    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (e) {
    console.error("JWT verification failed:", e);
    return null;
  }
}
