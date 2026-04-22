/** エージェントダッシュボードの返信フォーム用テンプレート（ワンクリック挿入） */

const LABELS = {
  jp: {
    firstReply: '初回返答',
    viewingSchedule: '内見調整',
    materialsAndInfo: '資料追加情報',
  },
  en: {
    firstReply: 'First Reply',
    viewingSchedule: 'Viewing Arrangement',
    materialsAndInfo: 'Additional Info',
  },
  th: {
    firstReply: 'การตอบกลับครั้งแรก',
    viewingSchedule: 'นัดหมายเข้าชม',
    materialsAndInfo: 'ข้อมูลเพิ่มเติม',
  },
} as const

const FALLBACK_NAME = {
  jp: '担当',
  en: 'Agent',
  th: 'เจ้าหน้าที่',
} as const

const TEMPLATE_TEXTS = {
  jp: {
    firstReply:
      'お問い合わせありがとうございます。\n{name}でございます。いただいた内容を確認のうえ、改めてご連絡いたします。\n引き続きよろしくお願いいたします。',
    viewingSchedule:
      'ご検討ありがとうございます。\n内見をご希望の場合は、ご都合のよい日時（第3希望まで）をお知らせください。調整のうえご案内いたします。',
    materialsAndInfo:
      '追加でご案内できる資料がございます。ご希望があればお知らせください。\nほかご不明点があれば、このメッセージにご返信ください。',
  },
  en: {
    firstReply:
      'Thank you for your inquiry.\nThis is {name}. We will review your request and get back to you shortly.\nWe appreciate your patience.',
    viewingSchedule:
      'Thank you for your interest.\nIf you would like to schedule a viewing, please share your preferred dates and times (up to 3 options), and we will arrange it for you.',
    materialsAndInfo:
      'We can share additional materials and information.\nPlease let us know what you need, and feel free to reply to this message with any questions.',
  },
  th: {
    firstReply:
      'ขอบคุณสำหรับการติดต่อครับ/ค่ะ\n{name} ขอตรวจสอบรายละเอียดที่แจ้งไว้ก่อน แล้วจะติดต่อกลับโดยเร็วที่สุดครับ/ค่ะ\nขอบคุณครับ/ค่ะ',
    viewingSchedule:
      'ขอบคุณที่สนใจครับ/ค่ะ\nหากต้องการนัดเข้าชม กรุณาแจ้งวันและเวลาที่สะดวก (ไม่เกิน 3 ช่วงเวลา) แล้วเราจะช่วยประสานงานให้ครับ/ค่ะ',
    materialsAndInfo:
      'เรามีเอกสารและข้อมูลเพิ่มเติมที่สามารถส่งให้ได้ครับ/ค่ะ\nหากต้องการข้อมูลส่วนไหนเพิ่มเติม กรุณาแจ้งได้เลย และสามารถตอบกลับข้อความนี้เพื่อสอบถามเพิ่มเติมได้ครับ/ค่ะ',
  },
} as const

/**
 * @param accountDisplayName プロフィールのアカウント名（通常は full_name）。空のときは「担当」。
 */
export function getInquiryReplyTemplates(
  accountDisplayName: string,
  locale: string = 'jp'
): { label: string; text: string }[] {
  const key = locale as keyof typeof LABELS
  const localeLabels = LABELS[key] ?? LABELS.jp
  const localeTexts = TEMPLATE_TEXTS[key] ?? TEMPLATE_TEXTS.jp
  const fallbackName = FALLBACK_NAME[key] ?? FALLBACK_NAME.jp
  const name = accountDisplayName.trim() || fallbackName

  return [
    {
      label: localeLabels.firstReply,
      text: localeTexts.firstReply.replace('{name}', name),
    },
    {
      label: localeLabels.viewingSchedule,
      text: localeTexts.viewingSchedule,
    },
    {
      label: localeLabels.materialsAndInfo,
      text: localeTexts.materialsAndInfo,
    },
  ]
}
