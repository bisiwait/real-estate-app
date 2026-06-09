export async function fetchAgentPlanProfile() {
    const res = await fetch('/api/agent/plan', { credentials: 'include' })
    const json = (await res.json().catch(() => ({}))) as {
        error?: string
        profile?: Record<string, unknown> | null
    }
    if (!res.ok) {
        throw new Error(json.error || 'プロフィールの取得に失敗しました。')
    }
    return json.profile ?? null
}

export async function createPropertyViaApi(payload: Record<string, unknown>): Promise<string> {
    const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => ({}))) as {
        error?: string
        property?: { id?: string }
    }
    if (!res.ok || !json.property?.id) {
        throw new Error(json.error || '物件の作成に失敗しました。')
    }
    return json.property.id
}

export async function updatePropertyViaApi(
    propertyId: string,
    payload: Record<string, unknown>
): Promise<void> {
    const res = await fetch(`/api/properties/${encodeURIComponent(propertyId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
        throw new Error(json.error || '物件の保存に失敗しました。')
    }
}

export async function createProjectViaApi(payload: Record<string, unknown>): Promise<string> {
    const res = await fetch('/api/agent/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
    })
    const json = (await res.json().catch(() => ({}))) as {
        error?: string
        project?: { id?: string }
    }
    if (!res.ok || !json.project?.id) {
        throw new Error(json.error || 'プロジェクトの作成に失敗しました。')
    }
    return json.project.id
}
