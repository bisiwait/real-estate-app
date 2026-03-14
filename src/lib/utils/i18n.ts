/**
 * Get the localized string from an object based on the current locale.
 * Fallback to the default (Japanese) if the localized field is missing.
 * 
 * @param obj The object containing fields like 'description', 'description_en', 'description_th'
 * @param baseField The base name of the field (e.g., 'description')
 * @param locale The current locale ('jp', 'en', 'th')
 * @returns The localized string
 */
export function getLocalizedField<T>(obj: any, baseField: string, locale: string): string {
    if (!obj) return '';

    if (locale === 'jp') {
        return obj[baseField] || '';
    }

    const localizedField = `${baseField}_${locale}`;
    return obj[localizedField] || obj[baseField] || '';
}

/**
 * Helper to ensure a consistent URL with locale prefix.
 */
export function getLocalizedPath(path: string, locale: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `/${locale}${cleanPath}`;
}
