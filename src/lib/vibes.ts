import type { Vibe } from './types';

export const VIBES: Vibe[] = [
  {
    id: 'casual',
    label: 'Casual',
    emoji: '☀️',
    description: 'Everyday natural, effortless beauty',
    keywords: ['nude', 'natural', 'soft', 'sheer', 'everyday', 'subtle', 'clean'],
  },
  {
    id: 'date-night',
    label: 'Date Night',
    emoji: '🌙',
    description: 'Romantic, alluring, memorable',
    keywords: ['rose', 'berry', 'romantic', 'soft', 'muted', 'pink', 'mauve'],
  },
  {
    id: 'party',
    label: 'Party',
    emoji: '✨',
    description: 'Bold, glamorous, head-turning',
    keywords: ['bold', 'bright', 'glam', 'vivid', 'statement', 'red', 'fuchsia'],
  },
  {
    id: 'traditional',
    label: 'Traditional',
    emoji: '🪔',
    description: 'Classic Indian, festive heritage',
    keywords: ['deep', 'red', 'maroon', 'brick', 'warm', 'rich', 'traditional'],
  },
  {
    id: 'festive',
    label: 'Festive',
    emoji: '🎉',
    description: 'Joyful, vibrant, celebratory',
    keywords: ['bright', 'coral', 'warm', 'vibrant', 'cherry', 'festive'],
  },
  {
    id: 'bold',
    label: 'Bold',
    emoji: '🔥',
    description: 'Daring, confident, powerful',
    keywords: ['dark', 'deep', 'berry', 'plum', 'burgundy', 'dramatic', 'bold'],
  },
  {
    id: 'clean-girl',
    label: 'Clean Girl',
    emoji: '💧',
    description: 'Minimal, fresh, glowing',
    keywords: ['nude', 'pink', 'soft', 'natural', 'sheer', 'glossy', 'fresh', 'minimal'],
  },
  {
    id: 'glam',
    label: 'Glam',
    emoji: '💎',
    description: 'Full glam, luxurious, red carpet',
    keywords: ['red', 'glam', 'sophisticated', 'classic', 'luxurious', 'matte', 'bold'],
  },
  {
    id: '90s-brown',
    label: '90s Brown',
    emoji: '🤎',
    description: 'Supermodel lip, brown nude',
    keywords: ['brown', '90s', 'supermodel', 'nude', 'mocha', 'teddy', 'warm', 'matte'],
  },
  {
    id: 'soft-romantic',
    label: 'Soft Romantic',
    emoji: '🌸',
    description: 'Dreamy, soft pink, delicate',
    keywords: ['pink', 'soft', 'rose', 'romantic', 'dreamy', 'dusty', 'delicate'],
  },
  {
    id: 'y2k-gloss',
    label: 'Y2K Gloss',
    emoji: '💿',
    description: 'Glossy, shiny, throwback',
    keywords: ['gloss', 'glossy', 'y2k', 'shiny', 'sheer', 'lipgloss', 'reflective'],
  },
  {
    id: 'dark-academia',
    label: 'Dark Academia',
    emoji: '📚',
    description: 'Moody, intellectual, deep',
    keywords: ['dark', 'berry', 'plum', 'burgundy', 'deep', 'moody', 'wine', 'intellectual'],
  },
];

export const CUSTOM_VIBE_KEYWORDS: Record<string, string[]> = {
  '90s supermodel': ['brown', '90s', 'supermodel', 'nude', 'mocha', 'matte', 'warm'],
  'modern nude': ['nude', 'natural', 'soft', 'sheer', 'modern', 'clean'],
  'fuller lips': ['nude', 'pink', 'soft', 'plumping', 'glossy', 'warm', 'natural'],
  'deep red traditional': ['deep', 'red', 'maroon', 'brick', 'warm', 'rich', 'traditional'],
  'soft pink clean': ['pink', 'soft', 'clean', 'natural', 'sheer', 'fresh', 'minimal'],
  'unique': ['unique', 'custom', 'personalized', 'one-of-a-kind'],
  'night party': ['bold', 'glam', 'sophisticated', 'medium', 'statement', 'berry', 'red'],
  'celebrity inspired': ['glam', 'sophisticated', 'classic', 'luxurious', 'matte'],
};
