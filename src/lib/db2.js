import { MongoClient, ObjectId } from "mongodb"; // See https://www.mongodb.com/docs/drivers/node/current/quick-start/
import { DB_URI } from "$env/static/private";

const client = new MongoClient(DB_URI);

await client.connect();
const db = client.db("myapp_pre"); // select database

//////////////////////////////////////////
// Tasks
//////////////////////////////////////////

// Get all tasks
async function getTasks() {
  let tasks = [];
  try {
    const collection = db.collection("tasks");

    // You can specify a query/filter here
    // See https://www.mongodb.com/docs/drivers/node/current/fundamentals/crud/query-document/
    const query = {};

    // Get all objects that match the query
    tasks = await collection.find(query).toArray();
    tasks.forEach((task) => {
      task._id = task._id.toString(); // convert ObjectId to String
    });
  } catch (error) {
    console.log(error);
  }
  return tasks;
}

// Get task by id
async function getTask(id) {
  let task = null;
  try {
    const collection = db.collection("tasks");
    const query = { _id: new ObjectId(id) }; // filter by id
    task = await collection.findOne(query);

    if (!task) {
      console.log("No task with id " + id);
    } else {
      task._id = task._id.toString(); // convert ObjectId to String
    }
  } catch (error) {
    console.log(error.message);
  }
  return task;
}

// Create new task (without priority)
async function createTask(title) {
  try {
    const collection = db.collection("tasks");
    const result = await collection.insertOne({
      title: title
    });
    return result.insertedId.toString();
  } catch (error) {
    console.log(error.message);
  }
  return null;
}

// Update task
async function updateTask(id, updates) {
  try {
    const collection = db.collection("tasks");
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );
    return result.modifiedCount > 0;
  } catch (error) {
    console.log(error.message);
  }
  return false;
}

// Move task up (swap priority with previous task)
async function moveTaskUp(taskId) {
  try {
    const collection = db.collection("tasks");
    let allTasks = await collection.find({}).toArray();

    // Sort: null/undefined first, then by priority
    allTasks.sort((a, b) => {
      const aPrio = a.priority === null || a.priority === undefined ? -Infinity : a.priority;
      const bPrio = b.priority === null || b.priority === undefined ? -Infinity : b.priority;
      return aPrio - bPrio;
    });

    const idx = allTasks.findIndex(t => t._id.toString() === taskId);

    if (idx > 0) {
      // Swap
      [allTasks[idx], allTasks[idx - 1]] = [allTasks[idx - 1], allTasks[idx]];

      // Recalculate priorities for moved tasks
      let priority = 1;
      for (const task of allTasks) {
        if (task.priority !== null && task.priority !== undefined) {
          await collection.updateOne(
            { _id: task._id },
            { $set: { priority } }
          );
          priority++;
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}

// Move task down
async function moveTaskDown(taskId) {
  try {
    const collection = db.collection("tasks");
    let allTasks = await collection.find({}).toArray();

    // Sort: null/undefined first, then by priority
    allTasks.sort((a, b) => {
      const aPrio = a.priority === null || a.priority === undefined ? -Infinity : a.priority;
      const bPrio = b.priority === null || b.priority === undefined ? -Infinity : b.priority;
      return aPrio - bPrio;
    });

    const idx = allTasks.findIndex(t => t._id.toString() === taskId);

    if (idx < allTasks.length - 1) {
      // Swap
      [allTasks[idx], allTasks[idx + 1]] = [allTasks[idx + 1], allTasks[idx]];

      // Recalculate priorities
      let priority = 1;
      for (const task of allTasks) {
        if (task.priority !== null && task.priority !== undefined) {
          await collection.updateOne(
            { _id: task._id },
            { $set: { priority } }
          );
          priority++;
        }
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}

// Renumber all active (non-done) prioritized tasks consecutively starting at 1
async function normalizePriorities(collection) {
  const tasks = await collection
    .find({ priority: { $exists: true, $ne: null }, status: { $ne: "done" } })
    .sort({ priority: 1 })
    .toArray();
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].priority !== i + 1) {
      await collection.updateOne({ _id: tasks[i]._id }, { $set: { priority: i + 1 } });
    }
  }
}

// Assign priority to unprioritized task, inserting at the given position
async function assignPriority(taskId, priority) {
  try {
    const collection = db.collection("tasks");
    const prioritized = await collection
      .find({ priority: { $exists: true, $ne: null }, status: { $ne: "done" } })
      .toArray();

    const maxPriority = prioritized.length + 1;
    const targetPriority = Math.max(1, Math.min(priority, maxPriority));

    // Only shift active tasks
    await collection.updateMany(
      { priority: { $gte: targetPriority }, status: { $ne: "done" } },
      { $inc: { priority: 1 } }
    );

    await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { priority: targetPriority } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

// Move a prioritized task to a new priority position, shifting others accordingly
async function reorderTask(taskId, newPriority) {
  try {
    const collection = db.collection("tasks");
    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task || task.priority == null) return;

    const current = task.priority;
    if (current === newPriority) return;

    if (current < newPriority) {
      await collection.updateMany(
        { priority: { $gt: current, $lte: newPriority } },
        { $inc: { priority: -1 } }
      );
    } else {
      await collection.updateMany(
        { priority: { $gte: newPriority, $lt: current } },
        { $inc: { priority: 1 } }
      );
    }

    await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { priority: newPriority } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

// Toggle task status between active and done
// When marking done: remove priority to prevent gaps, then renormalize
// When restoring: task appears in unprioritized list
async function toggleStatus(taskId) {
  try {
    const collection = db.collection("tasks");
    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task) return;

    if (task.status === "done") {
      await collection.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: { status: "active" }, $unset: { priority: "" } }
      );
    } else {
      await collection.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: { status: "done" }, $unset: { priority: "" } }
      );
      await normalizePriorities(collection);
    }
  } catch (error) {
    console.log(error.message);
  }
}

// Delete a task permanently, then renormalize remaining priorities
async function deleteTask(taskId) {
  try {
    const collection = db.collection("tasks");
    await collection.deleteOne({ _id: new ObjectId(taskId) });
    await normalizePriorities(collection);
  } catch (error) {
    console.log(error.message);
  }
}

export default {
  getTasks,
  getTask,
  createTask,
  updateTask,
  moveTaskUp,
  moveTaskDown,
  assignPriority,
  reorderTask,
  toggleStatus,
  deleteTask,
};
