export type Tone = 'dry' | 'brutal' | 'supportive';
export type Grumble = { id: string; text: string; tone: Tone; createdAt: string; favorite: boolean };
export type Preferences = { tone: Tone; autoplay: boolean; reducedMotion: boolean };
