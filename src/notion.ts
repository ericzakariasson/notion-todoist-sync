import { Client } from "@notionhq/client";
import { env } from "./environment";

const notion = new Client({
  auth: env.NOTION_TOKEN,
});

export async function getChangedPages(from: Date, to: Date) {
  const response = await notion.databases.query({
    database_id: env.NOTION_DATABASE_ID,
    filter: {
      and: [
        {
          last_edited_time: {
            on_or_after: from.toISOString(),
          },
          timestamp: "last_edited_time",
        },
        {
          last_edited_time: {
            before: to.toISOString(),
          },
          timestamp: "last_edited_time",
        },
      ],
    },
  });

  return response;
}

export async function getPageTitleProperty(pageId: string, propertyId: string) {
  const response = await notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: propertyId,
  });

  if (response.object !== "list") {
    throw new Error("Response object is not list");
  }

  const [item] = response.results;

  if (item.type !== "title") {
    throw new Error("Response type is not title");
  }

  return item.title.plain_text;
}

export async function getPageRichTextProperty(
  pageId: string,
  propertyId: string
) {
  const response = await notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: propertyId,
  });

  if (response.object !== "list") {
    throw new Error("Response object is not list");
  }

  if (response.results.length === 0) {
    return "";
  }

  const [item] = response.results;

  if (item.type !== "rich_text") {
    throw new Error("Response type is not rich_text");
  }

  return item.rich_text.plain_text;
}

export async function getPageCheckboxProperty(
  pageId: string,
  propertyId: string
) {
  const response = await notion.pages.properties.retrieve({
    page_id: pageId,
    property_id: propertyId,
  });

  if (response.object !== "property_item") {
    throw new Error("Response object is not list");
  }

  if (response.type !== "checkbox") {
    throw new Error(`Response type is not checkbox`);
  }

  return response.checkbox;
}

export async function getPageByTitle(title: string, propertyName: string) {
  const response = await notion.databases.query({
    database_id: env.NOTION_DATABASE_ID,
    filter: {
      property: propertyName,
      title: {
        equals: title,
      },
    },
  });

  if (response.results.length !== 1) {
    throw new Error(`Expected 1 result, got ${response.results.length}`);
  }

  const [page] = response.results;

  return page;
}

export async function updatePageCheckboxToChecked(pageId: string) {
  return await notion.pages.update({
    page_id: pageId,
    properties: {
      Done: {
        type: "checkbox",
        checkbox: true,
      },
    },
  });
}

const PROPERTY_IDS = {
  Name: "title",
  Note: "AR%40A",
  Done: "K%3BZc",
};

export async function getPageProperties(pageId: string) {
  const title = await getPageTitleProperty(pageId, PROPERTY_IDS.Name);
  const note = await getPageRichTextProperty(pageId, PROPERTY_IDS.Note);
  const done = await getPageCheckboxProperty(pageId, PROPERTY_IDS.Done);

  return { title, note, done };
}
