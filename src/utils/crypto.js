const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
const fromHex = value => new Uint8Array(value.match(/.{2}/g).map(v => parseInt(v, 16)));
export async function hashPassword(password, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const iterations = 600000;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations }, key, 256);
  return ['pbkdf2-sha256', iterations, salt, hex(bits)].join('$');
}
export async function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== '600000' ||
      !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false;
  const actual = await hashPassword(password, parts[2]);
  let difference = actual.length ^ encoded.length;
  for (let i = 0; i < actual.length; i++) difference |= actual.charCodeAt(i) ^ encoded.charCodeAt(i);
  return difference === 0;
}
