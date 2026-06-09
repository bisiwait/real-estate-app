import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import ProfileEditClient from "./ProfileEditClient";

export const dynamic = "force-dynamic";

export default async function ProfileEditPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/profile/edit`)}`);
    }

    const admin = await createAdminClient();
    const { data: profile, error } = await admin
        .from("profiles")
        .select("full_name, phone, user_role, is_admin")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        redirect(`/${locale}/mypage`);
    }

    const isAgent =
        profile.user_role === "agent" || profile.user_role === "admin" || profile.is_admin === true;

    if (isAgent) {
        redirect(`/${locale}/dashboard/settings`);
    }

    const dict = await getDictionary(locale);

    return (
        <ProfileEditClient
            locale={locale}
            dict={dict}
            userEmail={user.email ?? ""}
            initial={{
                full_name: profile.full_name ?? "",
                phone: profile.phone ?? "",
            }}
        />
    );
}
