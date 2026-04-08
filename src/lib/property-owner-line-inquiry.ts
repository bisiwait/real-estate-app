/**
 * 物件オーナー（profiles）に「公開側で LINE 問い合わせを出す」材料があるか。
 * `line_basic_id`（公式）または `line_id`（URL／ID）のいずれかがあれば raw を返す。
 * `show_line_in_inquiry === false` のときは null（ボタン非表示）。
 */
export function getPropertyOwnerLineInquiryRawInput(profile: {
  line_basic_id?: string | null
  line_id?: string | null
  show_line_in_inquiry?: boolean | null
} | null | undefined): string | null {
  if (!profile || profile.show_line_in_inquiry === false) return null
  const bid = profile.line_basic_id?.trim()
  if (bid) return bid
  const lid = profile.line_id != null ? String(profile.line_id).trim() : ''
  if (lid) return lid
  return null
}
