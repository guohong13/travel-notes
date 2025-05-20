// RSA公钥
const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqq4+WEtTtQegtA1CeiVw
hXOVzzYa7NdY+hL7gJaGwUTyXG+dekH9kxhY4FBuBVRkSfSMQjpjnzi21BKjtnie
6J7cAWMC+KJPZpkuL6MZVlzhLw6iHvfF2l267lKt4K5ic4y7RIkLfE4rEIys6A6w
Q01X000NyFGhWNgLSmE3FRgUHLoedU5XQMTnTit1EKz+98Qeb2rxvlW7FpkQuYDe
WfKFQ3JSQH2O1oRkas0iCQfRewe0+ugetTRzQY4UW7yF4BwwfDXVkymj1fUNjNmj
NhOCU5CKfmlk+CZT5Nj1e3pveZjpuTqGWSDJ3HjI7FVt2Kzv7mBzZidDlVNLBa6B
jQIDAQAB
-----END PUBLIC KEY-----`;

let publicCryptoKey = null;

const initPublicKey = async () => {
  if (publicCryptoKey) return publicCryptoKey;

  const pemBody = publicKeyPEM
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s+/g, "");

  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  publicCryptoKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["encrypt"]
  );

  return publicCryptoKey;
};

export const encryptWithPublicKey = async (plainText) => {
  try {
    const key = await initPublicKey();
    const encoded = new TextEncoder().encode(plainText);
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key,
      encoded
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  } catch (err) {
    console.error("加密失败:", err);
    throw new Error("密码加密失败");
  }
};
