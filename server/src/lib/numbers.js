import { nextNumberTimestamp } from './db.js';
import { clientCode, employeeCode } from './numberCodes.js';

// RF 0102: "E" + 4 RFC letters + system timestamp.
// MongoDB allocates unique, monotonically increasing millisecond timestamps.
export async function generateEmployeeNumber(rfc, session) {
  return `E${employeeCode(rfc)}${await nextNumberTimestamp('employee', session)}`;
}

// RF 0202: RFC letters (or surname/name fallback) + unique timestamp.
export async function generateClientNumber(person, session) {
  return `${clientCode(person)}${await nextNumberTimestamp('client', session)}`;
}
