import { defineConfig } from 'astro/config';
import { unified, rehypeShiki } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { articleHeadings } from './src/plugins/article-headings.mjs';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
export default defineConfig({
  site: 'https://jiangfengyuan.github.io',
  output: 'static',
  prefetch: true,
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (url) => !url.includes('/blog-admin') && !url.includes('/404'),
      i18n: { defaultLocale: 'zh', locales: { zh: 'zh-CN', en: 'en-US' } },
    }),
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeRaw,
        [
          rehypeSanitize,
          {
            ...defaultSchema,
            tagNames: [...defaultSchema.tagNames, 'figure', 'figcaption'],
            attributes: {
              ...defaultSchema.attributes,
              img: [
                ...(defaultSchema.attributes?.img || []),
                'loading',
                'referrerPolicy',
                'width',
                'height',
              ],
              code: [['className', /^language-./]],
              p: [['className', /^(article-lead|article-centered|article-closing)$/]],
              h2: [['className', /^(article-centered|article-blue)$/]],
              strong: [['className', /^(article-warm|article-blue)$/]],
              div: [['className', /^article-credits$/]],
            },
            protocols: {
              ...defaultSchema.protocols,
              href: ['http', 'https', 'mailto', 'tel'],
              src: ['http', 'https'],
            },
          },
        ],
        articleHeadings,
        [
          rehypeShiki,
          {
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
            wrap: true,
          },
        ],
      ],
    }),
    syntaxHighlight: false,
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
      wrap: true,
    },
  },
});
