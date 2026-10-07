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
  integrations: [
    sitemap({ filter: (url) => !url.includes('/blog-admin') && !url.includes('/404') }),
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
