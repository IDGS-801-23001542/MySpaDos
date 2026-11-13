// Official RFC fallback for clients who do not supply an RFC (RF 0202).
export function normalizeLetters(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export function fallbackClientCode({ name, lastName, secondLastName }) {
  const paternal = normalizeLetters(lastName);
  const internalVowel = paternal.slice(1).match(/[AEIOU]/)?.[0] || 'X';
  return [
    paternal[0] || 'X',
    internalVowel,
    normalizeLetters(secondLastName)[0] || 'X',
    normalizeLetters(name)[0] || 'X',
  ].join('');
}

export function clientCode(person) {
  const rfc = String(person.rfc || '').trim().toUpperCase().match(/^[A-ZÑ&]{4}/)?.[0] || '';
  return rfc.length === 4 ? rfc : fallbackClientCode(person);
}

export function employeeCode(rfc) {
  return String(rfc || '').trim().toUpperCase().slice(0, 4);
}
