/**
 * Membersihkan judul anime dari metadata episode (seperti Episode X, OVA, End, dll.)
 * agar didapatkan judul seri yang bersih untuk riwayat tontonan.
 */
export function cleanSeriesTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let jt = rawTitle;
  jt = jt.replace(/(?:Episode|Eps)\s*\d+\s*-\s*\d+.*$/i, '');
  jt = jt.replace(/\s*\d+\s*-\s*\d+\s*(?:Tamat|End)?.*$/i, '');
  jt = jt.replace(/(?:Episode|Eps)\s*\d+.*$/i, '');
  jt = jt.replace(/\s*OVA\s*\d*.*$/i, '');
  jt = jt.replace(/(?:\s*[\(\[]?BD[\)\]]?\s*)?(?:\s*[\(\[]?Batch[\)\]]?\s*)/gi, '');
  jt = jt.replace(/\s*[\(\[]?(?:End|Tamat)[\)\]]?\s*/gi, '');
  return jt.replace(/[-\s]+$/, '').trim();
}
