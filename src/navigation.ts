import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Home',
      href: getPermalink('/'),
    },
    {
      text: 'Projects',
      href: getPermalink('/activity'),
    },
    {
      text: 'Infrastructure',
      href: getPermalink('/infrastructure'),
    },
  ],
};
