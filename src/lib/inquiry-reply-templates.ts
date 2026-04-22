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

const OTHER_TEMPLATES_TEXT: { text: string }[] = [
  {
    text: 'ご検討ありがとうございます。\n内見をご希望の場合は、ご都合のよい日時（第3希望まで）をお知らせください。調整のうえご案内いたします。',
  },
  {
    text: '追加でご案内できる資料がございます。ご希望があればお知らせください。\nほかご不明点があれば、このメッセージにご返信ください。',
  },
]

/**
 * @param accountDisplayName プロフィールのアカウント名（通常は full_name）。空のときは「担当」。
 */
export function getInquiryReplyTemplates(
  accountDisplayName: string,
  locale: string = 'jp'
): { label: string; text: string }[] {
  const name = accountDisplayName.trim() || '担当'
  const localeLabels =
    LABELS[locale as keyof typeof LABELS] ?? LABELS.jp
  return [
    {
      label: localeLabels.firstReply,
      text: `お問い合わせありがとうございます。\n${name}でございます。いただいた内容を確認のうえ、改めてご連絡いたします。\n引き続きよろしくお願いいたします。`,
    },
    {
      label: localeLabels.viewingSchedule,
      text: OTHER_TEMPLATES_TEXT[0].text,
    },
    {
      label: localeLabels.materialsAndInfo,
      text: OTHER_TEMPLATES_TEXT[1].text,
    },
  ]
}
