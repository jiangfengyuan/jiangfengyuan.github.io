import { getCollection } from 'astro:content';
import rawProjects from './projects.json';
import rawUpdates from './updates.json';
import rawProfile from './profile.json';
import { projectsSchema, updatesSchema, profileSchema } from './schemas';
export type Localized = { zh: string; en: string };
export const projects = projectsSchema.parse(rawProjects);
export const updates = updatesSchema.parse(rawUpdates).sort((a, b) => b.date.localeCompare(a.date));
export const profile = profileSchema.parse(rawProfile);
export async function publishedPosts() {
  return (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.localeCompare(a.data.date) || b.data.id.localeCompare(a.data.id),
  );
}
export const site = 'https://jiangfengyuan.github.io';
