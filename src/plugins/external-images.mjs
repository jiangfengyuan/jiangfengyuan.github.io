// Hotlink-protected hosts (e.g. WeChat's mmbiz.qpic.cn) reject requests that carry our origin as referrer.
// Strip the referrer from every remote article image so imported posts load regardless of how they were authored;
// remote images are never the cover, so lazy-load them off the critical path.
export function externalImages() {
  return (tree) => {
    function walk(node) {
      if (node.type === 'element' && node.tagName === 'img') {
        const src = String(node.properties?.src || '');
        if (/^https?:\/\//i.test(src)) {
          node.properties.referrerPolicy = 'no-referrer';
          node.properties.loading = 'lazy';
          node.properties.decoding = 'async';
        }
      }
      for (const child of node.children || []) walk(child);
    }
    walk(tree);
  };
}
