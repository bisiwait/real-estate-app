'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'agent' | 'general'

export interface UserData {
    isAdmin: boolean
    fullName: string | null
    role: UserRole
}

interface AuthContextType {
    user: User | null
    session: Session | null
    userData: UserData
    isLoading: boolean
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    userData: { isAdmin: false, fullName: null, role: 'general' },
    isLoading: true,
    refreshUser: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [userData, setUserData] = useState<UserData>({
        isAdmin: false,
        fullName: null,
        role: 'general'
    })
    const [isLoading, setIsLoading] = useState(true)

    const fetchUserData = async (userId: string) => {
        let { data, error } = await supabase
            .from('profiles')
            .select('is_admin, full_name, user_role')
            .eq('id', userId)
            .single()

        if (error) {
            console.warn('AuthProvider: Fetch with role failed, falling back:', error)
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('profiles')
                .select('is_admin, full_name')
                .eq('id', userId)
                .single()
            data = fallbackData as any
            error = fallbackError
        }

        if (!error && data) {
            const is_admin = data.is_admin === true || (data as any).user_role === 'admin'
            const is_agent = (data as any).user_role === 'agent'

            setUserData({
                isAdmin: is_admin,
                fullName: data.full_name || null,
                role: is_admin ? 'admin' : (is_agent ? 'agent' : 'general')
            })
        } else {
            setUserData({ isAdmin: false, fullName: null, role: 'general' })
        }
    }

    const refreshUser = async () => {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
            await fetchUserData(session.user.id)
        } else {
             setUserData({ isAdmin: false, fullName: null, role: 'general' })
        }
        setIsLoading(false)
    }

    useEffect(() => {
        refreshUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchUserData(session.user.id)
            } else {
                setUserData({ isAdmin: false, fullName: null, role: 'general' })
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user, session, userData, isLoading, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}
