import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomPageForm } from "@/components/manage/custom-pages";
import { RichText } from "@/components/reports/rich-text";
import { db } from "@/lib/db/client";
import { customPages } from "@/lib/db/schema";
import { getCustomPages } from "@/lib/nav-data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

function findPage(slug: string) {
  return db.select().from(customPages).where(eq(customPages.slug, slug)).get();
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const page = findPage(slug);
  return { title: page?.title ?? "Page" };
}

export default async function CustomPage({ params }: Params) {
  const { slug } = await params;
  const page = findPage(slug);
  if (!page) notFound();
  if (page.kind === "link" && page.url) redirect(page.url);

  const sections = [...new Set(getCustomPages().map((p) => (p.section ?? "").trim() || "My pages"))];

  return (
    <>
      <PageHeader title={page.title} description={(page.section || "My pages") + " · custom page"} />
      <Card>
        <CardContent className="pt-5">
          {page.content?.trim() ? (
            <RichText text={page.content} />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This page is empty — use “Edit this page” below to add notes, links, and lists.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Edit this page</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomPageForm
            page={{
              id: page.id,
              title: page.title,
              slug: page.slug,
              section: page.section,
              icon: page.icon,
              kind: page.kind,
              url: page.url,
              content: page.content,
              position: page.position,
            }}
            sections={sections}
          />
        </CardContent>
      </Card>
    </>
  );
}
