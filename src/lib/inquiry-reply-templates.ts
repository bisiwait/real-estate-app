/** エージェントダッシュボードの返信フォーム用テンプレート（ワンクリック挿入） */

const OTHER_TEMPLATES: { label: string; text: string }[] = [
  {
    label: '内見調整',
    text: 'ご検討ありがとうございます。\n内見をご希望の場合は、ご都合のよい日時（第3希望まで）をお知らせください。調整のうえご案内いたします。',
  },
  {
    label: '資料・追加情報',
    text: '追加でご案内できる資料がございます。ご希望があればお知らせください。\nほかご不明点があれば、このメッセージにご返信ください。',
  },
]

/**
 * @param accountDisplayName プロフィールのアカウント名（通常は full_name）。空のときは「担当」。
 */
export function getInquiryReplyTemplates(accountDisplayName: string): { label: string; text: string }[] {
  const name = accountDisplayName.trim() || '担当'
  return [
    {
      label: '初回返信',
      text: `お問い合わせありがとうございます。\n${name}でございます。いただいた内容を確認のうえ、改めてご連絡いたします。\n引き続きよろしくお願いいたします。`,
    },
    ...OTHER_TEMPLATES,
  ]
}
