import { redirect } from "next/navigation";

/** 掲載案内・料金は `/pricing` に統合しました（旧URL互換のリダイレクト） */
export default async function AgentWelcomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    redirect(`/${locale}/pricing`);
}
