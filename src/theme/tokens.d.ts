export type TokenName =
  | 'bg'
  | 'surface'
  | 'surface2'
  | 'rim'
  | 'fg'
  | 'muted'
  | 'accent1'
  | 'accent2'
  | 'accentSolid'
  | 'accentText'
  | 'success'
  | 'info'
  | 'danger'
  | 'off';

export const tokens: Record<TokenName, string>;
export function tint(hex: string, alpha: number): string;
