export function redirectLegacyPost() {
  const id = new URLSearchParams(location.search).get('p');
  if (!id) return;
  const target = '/blog/' + encodeURIComponent(id) + '/';
  location.replace(target + location.hash);
}
