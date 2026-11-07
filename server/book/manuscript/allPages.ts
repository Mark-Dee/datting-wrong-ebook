import { BookPage } from '../../../src/types.ts';
import { PAGES_FRONTMATTER } from './pagesFrontmatter.ts';
import { PAGES_CH1 } from './pagesCh1.ts';
import { PAGES_CH2 } from './pagesCh2.ts';
import { PAGES_CH3 } from './pagesCh3.ts';
import { PAGES_CH4 } from './pagesCh4.ts';
import { PAGES_CH5 } from './pagesCh5.ts';
import { PAGES_CH6 } from './pagesCh6.ts';

export const ALL_BOOK_PAGES: BookPage[] = [
  ...PAGES_FRONTMATTER,
  ...PAGES_CH1,
  ...PAGES_CH2,
  ...PAGES_CH3,
  ...PAGES_CH4,
  ...PAGES_CH5,
  ...PAGES_CH6,
];
