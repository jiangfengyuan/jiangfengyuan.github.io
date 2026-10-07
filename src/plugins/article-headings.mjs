// Collect headings after raw HTML has been parsed and sanitized. Keep legacy section-N IDs.
export function articleHeadings() {
  return (tree, file) => {
    const headings = [];
    const used = new Set();
    let section = 0;
    const text = (node) =>
      node.type === 'text' ? node.value : (node.children || []).map(text).join('');
    function walk(node) {
      if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
        const depth = Number(node.tagName[1]);
        if (depth === 2 || depth === 3) section++;
        let slug = node.properties?.id || `section-${section}`;
        if (used.has(slug)) slug += `-${section}`;
        used.add(slug);
        node.properties ||= {};
        node.properties.id = slug;
        headings.push({ depth, slug, text: text(node) });
      }
      for (const child of node.children || []) walk(child);
    }
    walk(tree);
    file.data.astro ||= {};
    file.data.astro.headings = headings;
  };
}
