const cryptoNode = require('crypto');

function generateDeterministicPassword(email, secret) {
  return cryptoNode
    .createHmac("sha256", secret)
    .update(email)
    .digest("hex");
}

async function generateDeterministicPasswordWebCrypto(email, secret) {
  const { subtle } = require('crypto').webcrypto;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(email);
  
  const key = await subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await subtle.sign(
    "HMAC",
    key,
    messageData
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function run() {
  const email = "user@example.com";
  const secret = "my-secret-key-12345";
  const nodeRes = generateDeterministicPassword(email, secret);
  const webRes = await generateDeterministicPasswordWebCrypto(email, secret);
  console.log("Node:", nodeRes);
  console.log("Web Crypto:", webRes);
  console.log("Match:", nodeRes === webRes);
}

run();
