import { ObjectId } from "mongodb";
import { db } from "$lib/mongodb.server.js";

// Renumber all active prioritized tasks of a user consecutively starting at 1
async function normalizePriorities(collection, userId) {
  const tasks = await collection
    .find({ userId, priority: { $exists: true, $ne: null }, status: { $ne: "done" } })
    .sort({ priority: 1 })
    .toArray();
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i].priority !== i + 1) {
      await collection.updateOne({ _id: tasks[i]._id }, { $set: { priority: i + 1 } });
    }
  }
}

async function getTasks(userId) {
  let tasks = [];
  try {
    const collection = db.collection("tasks");
    tasks = await collection.find({ userId }).toArray();
    tasks.forEach((task) => {
      task._id = task._id.toString();
    });
  } catch (error) {
    console.log(error);
  }
  return tasks;
}

async function createTask(title, userId) {
  try {
    const collection = db.collection("tasks");
    const result = await collection.insertOne({ title, userId });
    return result.insertedId.toString();
  } catch (error) {
    console.log(error.message);
  }
  return null;
}

async function assignPriority(taskId, priority, userId) {
  try {
    const collection = db.collection("tasks");
    const prioritized = await collection
      .find({ userId, priority: { $exists: true, $ne: null }, status: { $ne: "done" } })
      .toArray();

    const maxPriority = prioritized.length + 1;
    const targetPriority = Math.max(1, Math.min(priority, maxPriority));

    await collection.updateMany(
      { userId, priority: { $gte: targetPriority }, status: { $ne: "done" } },
      { $inc: { priority: 1 } }
    );

    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { priority: targetPriority } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function reorderTask(taskId, newPriority, userId) {
  try {
    const collection = db.collection("tasks");
    const task = await collection.findOne({ _id: new ObjectId(taskId), userId });
    if (!task || task.priority == null) return;

    const current = task.priority;
    if (current === newPriority) return;

    if (current < newPriority) {
      await collection.updateMany(
        { userId, priority: { $gt: current, $lte: newPriority } },
        { $inc: { priority: -1 } }
      );
    } else {
      await collection.updateMany(
        { userId, priority: { $gte: newPriority, $lt: current } },
        { $inc: { priority: 1 } }
      );
    }

    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { priority: newPriority } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function toggleStatus(taskId, userId) {
  try {
    const collection = db.collection("tasks");
    const task = await collection.findOne({ _id: new ObjectId(taskId), userId });
    if (!task) return;

    if (task.status === "done") {
      await collection.updateOne(
        { _id: new ObjectId(taskId), userId },
        { $set: { status: "active" }, $unset: { priority: "" } }
      );
    } else {
      await collection.updateOne(
        { _id: new ObjectId(taskId), userId },
        { $set: { status: "done" }, $unset: { priority: "" } }
      );
      await normalizePriorities(collection, userId);
    }
  } catch (error) {
    console.log(error.message);
  }
}

async function deleteTask(taskId, userId) {
  try {
    const collection = db.collection("tasks");
    await collection.deleteOne({ _id: new ObjectId(taskId), userId });
    await normalizePriorities(collection, userId);
  } catch (error) {
    console.log(error.message);
  }
}

async function getBacklogTasks(userId) {
  try {
    const collection = db.collection("tasks");
    const tasks = await collection
      .find({
        userId,
        $and: [
          { $or: [{ sprint: "backlog" }, { sprint: { $exists: false } }] },
          { $or: [{ date: { $exists: false } }, { date: null }] },
        ],
      })
      .sort({ createdAt: -1 })
      .toArray();
    tasks.forEach((t) => { t._id = t._id.toString(); });
    return tasks;
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function getScheduledTasks(userId) {
  try {
    const collection = db.collection("tasks");
    const tasks = await collection
      .find({ userId, date: { $exists: true, $ne: null } })
      .toArray();
    tasks.forEach((t) => { t._id = t._id.toString(); });
    return tasks;
  } catch (error) {
    console.log(error);
    return [];
  }
}

async function setTaskDate(taskId, date, userId) {
  try {
    const collection = db.collection("tasks");
    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { date, sprint: "calendar" } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function setTaskCol(taskId, col, userId) {
  try {
    const collection = db.collection("tasks");
    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { col } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function moveToBacklog(taskId, userId) {
  try {
    const collection = db.collection("tasks");
    await collection.updateOne(
      { _id: new ObjectId(taskId), userId },
      { $set: { sprint: "backlog", col: "todo" }, $unset: { date: "" } }
    );
  } catch (error) {
    console.log(error.message);
  }
}

async function createBacklogTask({ title, type, prio, sp, description, userId }) {
  try {
    const collection = db.collection("tasks");
    const result = await collection.insertOne({
      title,
      type,
      prio,
      sp,
      description: description || "",
      sprint: "backlog",
      col: "todo",
      userId,
      createdAt: new Date(),
    });
    return result.insertedId.toString();
  } catch (error) {
    console.log(error.message);
    return null;
  }
}

export default {
  getTasks,
  createTask,
  assignPriority,
  reorderTask,
  toggleStatus,
  deleteTask,
  getBacklogTasks,
  createBacklogTask,
  getScheduledTasks,
  setTaskDate,
  setTaskCol,
  moveToBacklog,
};
