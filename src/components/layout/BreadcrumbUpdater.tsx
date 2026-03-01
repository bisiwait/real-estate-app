'use client'

import { useEffect } from 'react'

/**
 * ページコンポーネント内に配置して、パンくずリストに動的なラベルを伝達するためのコンポーネント。
 */
export default function BreadcrumbUpdater({ label }: { label: string }) {
    useEffect(() => {
        // マウント時にカスタムイベントでラベルを送信
        window.dispatchEvent(new CustomEvent('breadcrumb-update', {
            detail: { label }
        }))

        // アンマウント時（ページ遷移時など）にリセット
        return () => {
            window.dispatchEvent(new CustomEvent('breadcrumb-update', {
                detail: { label: null }
            }))
        }
    }, [label])

    return null
}
