import { TodoistApi } from "@doist/todoist-api-typescript";
import { startOfMinute } from "date-fns";
import "dotenv/config";
import { env } from "./environment";
import {
  getChangedPages,
  getPageByTitle,
  getPageProperties,
  updatePageCheckboxToChecked,
} from "./notion";
import { getActivityLogEvents } from "./todoist";

/**
 * TODO:
 * - store Notion <-> Todoist id mapping
 * - handle conflicts and decide source of truth
 * - only get items from Notion where changed at is in latest minute (or how often this function runs)
 * - Notion change data capture by diffing?
 */

const NOW = new Date();
const CURRENT_MINUTE = startOfMinute(NOW);

const todoist = new TodoistApi(env.TODOIST_TOKEN);

async function main() {
  const activeTodoistTasks = await todoist.getTasks({
    projectId: Number(env.TODOIST_PROJECT_ID),
  });

  const events = await getActivityLogEvents();
  console.log(events);

  const pages = await getChangedPages(CURRENT_MINUTE);

  const completedTaskEvents = events.filter(
    (event) => event.event_type === "completed"
  );

  for (const page of pages.results) {
    const { title, note, done } = await getPageProperties(page.id);

    const task = activeTodoistTasks.find((t) => t.content === title);

    const taskEvents = events.filter(
      (event) => event.extra_data.content === title
    );

    const isCompletedFromTodoistEvent = taskEvents.find(
      (event) => event.event_type === "completed"
    );

    if (!task && !isCompletedFromTodoistEvent) {
      console.log("Adding task", {
        content: title,
        description: note,
      });
      const addedTask = await todoist.addTask({
        projectId: Number(env.TODOIST_PROJECT_ID),
        content: title,
        description: note,
      });
      console.log("Added task", addedTask.id);
      continue;
    }

    if (done && task?.completed === false) {
      console.log("Closing task", {
        id: task.id,
      });
      const closeSuccess = await todoist.closeTask(task.id);
      console.log("Closed task", { success: closeSuccess });
      continue;
    }

    console.log("No action");
  }

  for (const event of completedTaskEvents) {
    const page = await getPageByTitle(event.extra_data.content, "Name");
    console.log("Updating notion page", { pageId: page.id });
    await updatePageCheckboxToChecked(page.id);
    console.log("Updated notion page", { pageId: page.id });
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
