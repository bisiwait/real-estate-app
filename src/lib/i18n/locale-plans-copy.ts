import jp from '../../../messages/jp.json'
import en from '../../../messages/en.json'
import th from '../../../messages/th.json'

type ListPropertyPlans = (typeof jp)['list_property_plans']

function pickLocale(locale: string): 'jp' | 'en' | 'th' {
  if (locale === 'en') return 'en'
  if (locale === 'th') return 'th'
  return 'jp'
}

export function getListPropertyPlansCopy(locale: string): ListPropertyPlans {
  const key = pickLocale(locale)
  const packs = { jp, en, th }
  return packs[key].list_property_plans
}

/** エージェント公開プロフィール：スタンダード時の LINE 非表示メッセージ */
export function getAgentsPageLineGateCopy(locale: string): string {
  const key = pickLocale(locale)
  const packs = { jp, en, th }
  return packs[key].agents_page.line_contact_premium_only
}
