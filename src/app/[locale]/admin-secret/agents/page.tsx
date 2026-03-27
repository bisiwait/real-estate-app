import { Suspense } from "react";
import AgentsPageClient from "./AgentsPageClient";

function AgentsFallback() {
    return (
        <div className="bg-slate-50 min-h-screen pb-20 pt-24 flex items-center justify-center">
            <p className="text-sm font-bold text-slate-400">読み込み中...</p>
        </div>
    );
}

export default function AgentsManagementPage() {
    return (
        <Suspense fallback={<AgentsFallback />}>
            <AgentsPageClient />
        </Suspense>
    );
}
