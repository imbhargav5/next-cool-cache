import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from 'fumadocs-ui/page';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import type { DocData } from 'fumadocs-mdx/runtime/types';

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

const mdxComponents = {
  Card,
  Cards,
  Callout,
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    notFound();
  }

  // Type assertion: fumadocs-mdx adds body and toc to page data
  const data = page.data as typeof page.data & DocData;
  const MDX = data.body;

  return (
    <DocsPage toc={data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
