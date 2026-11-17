/** Interrupteurs des étapes de la chaîne de rendu (paramètres d'URL) : permettent de situer un défaut d'image par élimination. */
export type RenderFlags = { light: boolean; ao: boolean; tex: boolean; grade: boolean; exposure: boolean; soft: boolean }
export const flags: RenderFlags = { light: true, ao: true, tex: true, grade: true, exposure: true, soft: true }
export const setFlags = (partial: Partial<RenderFlags>): void => { Object.assign(flags, partial) }
