
const dictionaries = {
    jp: () => import('../../../messages/jp.json').then((module) => module.default),
    en: () => import('../../../messages/en.json').then((module) => module.default),
    th: () => import('../../../messages/th.json').then((module) => module.default),
}

export const getDictionary = async (locale: string) => {
    const loader = dictionaries[locale as keyof typeof dictionaries] || dictionaries.jp
    return loader()
}
