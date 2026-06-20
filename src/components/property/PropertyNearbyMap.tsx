'use client'

import { useState } from 'react'
import { hasGoogleMapsApiKey } from '@/lib/google-maps-browser-loader'
import PropertyNearbyMapGoogle from '@/components/property/PropertyNearbyMapGoogle'
import PropertyNearbyMapLeaflet from '@/components/property/PropertyNearbyMapLeaflet'
import type { PropertyNearbyMapViewProps } from '@/components/property/PropertyNearbyMapLeaflet'

export default function PropertyNearbyMap(props: PropertyNearbyMapViewProps) {
    const [useLeaflet, setUseLeaflet] = useState(!hasGoogleMapsApiKey())

    if (useLeaflet) {
        return <PropertyNearbyMapLeaflet {...props} />
    }

    return <PropertyNearbyMapGoogle {...props} onFailure={() => setUseLeaflet(true)} />
}
