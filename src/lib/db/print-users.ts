import { db } from './index';
import { users } from './schema';

async function printUsers() {
  const all = await db.select().from(users);
  console.log('All users in DB:', all);
}

printUsers();
