import { nanoid } from "nanoid";
import { getDb } from "@/db/database";
import type { CreateLinkSchemaType } from "@/zod/links";
import { links } from "@/drizzle-out/schema";

export async function createLink(
  data: CreateLinkSchemaType & { accountId: string }
) {
  const db = getDb();
  const id = nanoid(10);

  await db.insert(links).values({
    linkId: id,
    accountId: data.accountId,
    name: data.name,
    destinations: JSON.stringify(data.destinations),
  });
}
