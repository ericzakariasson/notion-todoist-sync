import { TodoistApi } from "@doist/todoist-api-typescript";
import { isWithinInterval } from "date-fns";
import fetch from "node-fetch";
import { env } from "./environment";

export const todoist = new TodoistApi(env.TODOIST_TOKEN);

export interface TodoistActivityLogEvent {
  id: number;
  object_type: string;
  object_id: number;
  legacy_object_id: number;
  event_type: string;
  event_date: string;
  parent_project_id: number;
  legacy_parent_project_id: number;
  parent_item_id: number | null;
  legacy_parent_item_id: number | null;
  initiator_id: number | null;
  extra_data: {
    content: string;
    client: string;
  };
}

export interface TodoistActivityLogEventResponse {
  count: number;
  events: TodoistActivityLogEvent[];
}

export async function getActivityLogEvents(from: Date, to: Date) {
  const parameters = new URLSearchParams({
    parent_project_id: env.TODOIST_PROJECT_ID,
    object_type: "item",
  });

  const response = await fetch(
    `https://api.todoist.com/sync/v8/activity/get?${parameters.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${env.TODOIST_TOKEN}`,
      },
    }
  );

  const json = await response.json();

  const data = json as unknown as TodoistActivityLogEventResponse;

  const events = data.events.filter((event) =>
    isWithinInterval(new Date(event.event_date), {
      start: from,
      end: to,
    })
  );

  return events;
}
