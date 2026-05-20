import { MongoClient } from "mongodb";
import { DB_URI } from "$env/static/private";

const client = new MongoClient(DB_URI);
await client.connect();

export const mongoClient = client;
export const db = client.db("myapp");
