import { getPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Home',
      href: getPermalink('/'),
    },
    {
      text: 'Personal',
      href: getPermalink('/personal'),
    },
    {
      text: 'CV',
      href: getPermalink('/cv'),
    },
    {
      text: 'Goals & Activity',
      href: getPermalink('/activity'),
    },
    {
      text: 'Blog',
      href: getPermalink('/blog'),
    },
    {
      text: 'Contact',
      href: getPermalink('/contact'),
    },
  ],
};
