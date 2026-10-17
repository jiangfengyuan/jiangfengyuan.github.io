// Hotlink-protected hosts (e.g. WeChat's mmbiz.qpic.cn) reject requests that carry our origin as referrer.
// Strip the referrer from every remote article image so imported posts load regardless of how they were authored.
export function externalImages() {
  return (tree) => {
    function walk(node) {
      if (node.type === 'element' && node.tagName === 'img') {
        const src = String(node.properties?.src || '');
        if (/^https?:\/\//i.test(src)) node.properties.referrerPolicy = 'no-referrer';
      }
      for (const child of node.children || []) walk(child);
    }
    walk(tree);
  };
}
