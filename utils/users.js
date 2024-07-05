import { ObjectId } from 'mongodb';
import dbClient from './db';

export async function getIdAndKey(req) {
  const userId = req.headers['x-user-id'];
  const apiKey = req.headers['x-api-key'];

  return { userId, apiKey };
}

export async function isValidUser(userId) {
  if (!ObjectId.isValid(userId)) return false;

  const user = await dbClient.users.findOne({ _id: ObjectId(userId) });
  return !!user;
}
