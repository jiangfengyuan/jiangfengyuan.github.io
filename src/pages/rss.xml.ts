import rss from '@astrojs/rss';
import { publishedPosts, site } from '../data/content';
import { postSlug } from '../i18n';
export async function GET() {
  return rss({
    title: 'Hayden — Writing & notes',
    description: '作品、赛车与日常的持续记录。',
    site,
    items: (await publishedPosts('zh')).map((p) => ({
      title: p.data.title,
      description: p.data.summary,
      pubDate: new Date(p.data.publishedAt || p.data.date),
      link: '/blog/' + postSlug(p) + '/',
    })),
    customData: '<language>zh-CN</language>',
  });
}
