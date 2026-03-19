import Stripe from 'stripe'

// サーバーサイド専用: Stripe インスタンスの共通エクスポート
// クライアントバンドルに含まれないよう、このファイルは必ず Server Component / API Route からのみインポートすること
if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[stripe] STRIPE_SECRET_KEY is not set. Using dummy key (build-time only).')
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'dummy_key_for_build', {
    apiVersion: '2026-01-28.clover',
})

export default stripe
