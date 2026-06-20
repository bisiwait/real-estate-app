'use client'

import { Component, type ReactNode } from 'react'

type Props = {
    children: ReactNode
}

type State = {
    hasError: boolean
}

/** 地図の初期化失敗で物件詳細全体が落ちないようにする */
export class PropertyMapErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(): State {
        return { hasError: true }
    }

    componentDidCatch(error: unknown) {
        console.warn('[PropertyNearbyMap] render failed', error)
    }

    render() {
        if (this.state.hasError) return null
        return this.props.children
    }
}
