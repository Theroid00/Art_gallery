export function getAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  const prefix = "/Art_gallery";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${cleanPath}`;
}

export async function hashPassword(password) {
  if (!password) return "";
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
