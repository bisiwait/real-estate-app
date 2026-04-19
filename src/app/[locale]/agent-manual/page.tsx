import type { Metadata } from 'next'
import AgentManualView from '@/components/agent-manual/AgentManualView'
import { hostHeaderFromHeaders } from '@/lib/env/deployment-target'
import { resolveOfficialLineAddFriendUrl } from '@/lib/line-official'
import { headers } from 'next/headers'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'エージェント向け使い方マニュアル | Chonburi Home',
    description:
      'パタヤ・シラチャの不動産業者向け。Chonburi Homeへの登録、物件掲載、お問い合わせ管理までをやさしく解説します。',
    alternates: {
      canonical: `/${locale}/agent-manual`,
    },
  }
}

export default async function AgentManualPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const h = await headers()
  const officialLineAddFriendUrl = await resolveOfficialLineAddFriendUrl(hostHeaderFromHeaders(h))

  return <AgentManualView locale={locale} officialLineAddFriendUrl={officialLineAddFriendUrl} />
}
