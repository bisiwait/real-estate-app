const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
fetch(`${base}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        url: 'https://www.fazwaz.jp/property-sales/1-bedroom-condo-for-sale-at-the-riviera-jomtien-in-nong-prue-pattaya-u551062',
    }),
})
    .then((r) => r.json())
    .then(console.log)
    .catch(console.error)
