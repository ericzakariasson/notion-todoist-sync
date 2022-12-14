import { addMinutes } from "date-fns";
import "dotenv/config";
import { env } from "./environment";
import {
  getChangedPages,
  getPageByTitle,
  getPageProperties,
  updatePageCheckboxToChecked,
} from "./notion";
import { getActivityLogEvents, todoist } from "./todoist";

/**
 * TODO:
 * - store Notion <-> Todoist id mapping
 * - handle conflicts and decide source of truth
 * - only get items from Notion where changed at is in latest minute (or how often this function runs)
 * - Notion change data capture by diffing?
 */

const MINUTES = Number(env.SYNC_INTERVAL_MINUTES);

async function main() {
  const NOW = new Date();

  const activeTodoistTasks = await todoist.getTasks({
    projectId: Number(env.TODOIST_PROJECT_ID),
  });

  const from = addMinutes(NOW, -MINUTES);
  const to = NOW;

  console.log(from, to);

  const events = await getActivityLogEvents(from, to);
  const pages = await getChangedPages(from, to);

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

    if (!task && !isCompletedFromTodoistEvent && !done) {
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
