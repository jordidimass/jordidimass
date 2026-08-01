import type { ThemeRegistrationRaw } from 'shiki';

const tokenRules = [
  {
    scope: ['comment', 'punctuation.definition.comment'],
    settings: { foreground: '#7A6666', fontStyle: 'italic' },
  },
  {
    scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.control'],
    settings: { foreground: '#FFBCBC' },
  },
  {
    scope: ['string', 'string.quoted'],
    settings: { foreground: '#E3B7A0' },
  },
  {
    scope: ['constant.numeric', 'constant.language', 'constant.character'],
    settings: { foreground: '#D8C08A' },
  },
  {
    scope: ['entity.name.function', 'support.function', 'meta.function-call'],
    settings: { foreground: '#F2D0D0' },
  },
  {
    scope: ['entity.name.tag', 'entity.other.attribute-name'],
    settings: { foreground: '#FFBCBC' },
  },
  {
    scope: ['variable', 'variable.parameter', 'variable.other'],
    settings: { foreground: '#E8E0D8' },
  },
  {
    scope: ['punctuation', 'meta.brace'],
    settings: { foreground: '#AC8B8B' },
  },
];

export const brandShikiTheme: ThemeRegistrationRaw = {
  name: 'brand-dark',
  type: 'dark',
  colors: {
    'editor.background': '#111010',
    'editor.foreground': '#E8E0D8',
  },
  settings: tokenRules,
  tokenColors: tokenRules,
};
