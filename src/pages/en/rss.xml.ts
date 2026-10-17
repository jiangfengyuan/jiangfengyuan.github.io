import rss from '@astrojs/rss';
import { profile, publishedPosts, site } from '../../data/content';
import { postSlug } from '../../i18n';

export async function GET() {
  return rss({
    title: 'Hayden — Writing & notes',
    description: profile.description.en,
    site,
    items: (await publishedPosts('en')).map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: new Date(p.data.publishedAt || p.data.date),
      link: '/en/blog/' + postSlug(p) + '/',
    })),
    customData: '<language>en-US</language>',
  });
}
