import { MongoClient } from 'mongodb';
import 'dotenv/config'

const client = new MongoClient(process.env.DATABASE_URI);

// the same database Better Auth writes users to
export const db = client.db(process.env.DB_NAME);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Successfully connected to Database!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

