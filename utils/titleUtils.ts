/**
 * Membersihkan judul anime dari teks SEO (Sub Indo, Subtitle Indonesia, dll)
 * serta metadata episode/batch (Episode X, Batch, End, Tamat)
 * agar didapatkan judul seri yang bersih untuk riwayat tontonan dan UI.
 */
export function cleanSeriesTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let jt = rawTitle.trim();
  // 1. Hapus nama situs & kata kunci SEO (Sub Indo, Subtitle Indonesia, dll.)
  jt = jt.replace(/[-–|]\s*(?:Samehadaku|Otakudesu|Kuronime|Neosatsu).*$/i, '');
  jt = jt.replace(/\s*(?:\(?Sub(?:title)?\s*Indo(?:nesia)?\)?)\s*/gi, '');
  // 2. Hapus metadata episode & batch
  jt = jt.replace(/(?:Episode|Eps)\s*\d+\s*-\s*\d+.*$/i, '');
  jt = jt.replace(/\s*\d+\s*-\s*\d+\s*(?:Tamat|End)?.*$/i, '');
  jt = jt.replace(/(?:Episode|Eps)\s*\d+.*$/i, '');
  jt = jt.replace(/\s*OVA\s*\d*.*$/i, '');
  jt = jt.replace(/(?:\s*[\(\[]?BD[\)\]]?\s*)?(?:\s*[\(\[]?Batch[\)\]]?\s*)/gi, '');
  jt = jt.replace(/\s*[\(\[]?(?:End|Tamat)[\)\]]?\s*/gi, '');
  // 3. Hapus pemisah dan karakter sisa di akhir string
  jt = jt.replace(/\s*[-–|]\s*$/i, '');
  return jt.replace(/[-\s]+$/, '').replace(/\s+/g, ' ').trim();
}
