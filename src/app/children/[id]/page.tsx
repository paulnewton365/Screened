import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * /children/[id] is an alias for the consolidated library view at
 * /dashboard?child=ID. Older bookmarks and any internal links still
 * pointing here continue to work.
 */
export default async function ChildLibraryRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard?child=${id}`);
}
