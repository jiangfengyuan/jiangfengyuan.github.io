import { defineConfig } from 'astro/config';
import { unified, rehypeShiki } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { articleHeadings } from './src/plugins/article-headings.mjs';
import { externalImages } from './src/plugins/external-images.mjs';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
export default defineConfig({
  site: 'https://jiangfengyuan.github.io',
  output: 'static',
  prefetch: true,
  // Astro emits the CSP <meta> per page and hashes its own inline scripts, so script-src needs no 'unsafe-inline'.
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' https://mmbiz.qpic.cn data:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Shiki colours and transition names live in style="" attributes; those cannot run code.
      // Astro does not hash its own transition:name scope <style> blocks, so list them here;
      // tests/e2e/csp.spec.ts fails if they change (e.g. after renaming a transition).
      styleDirective: {
        resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }],
        hashes: [
          'sha256-2QrBVRCWOWSGWE4PBJe8h7jetqApOabbtQYLG6895bU=',
          'sha256-Mfe+U9Sb8798zkhW4SKamkr9huuA1cT8qHOoNRzsIBw=',
        ],
      },
    },
  },
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
        externalImages,
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
