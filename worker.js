import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import mongodb from 'mongodb';
import UserCollection from './utils/users';
import fs from 'fs';
import FilesCollection from './utils/files';

// Initialize Bull queues
const filesQue = new Queue('thumbnails');
const usersQue = new Queue('Welcome Email');

function getObjectId(id) {
  return mongodb.ObjectId.isValid(id) ? new mongodb.ObjectId(id) : '';
}

// File processing queue
filesQue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) throw new Error('Missing fileId');
  if (!userId) throw new Error('Missing userId');

  const file = await FilesCollection.findOne({
    _id: getObjectId(fileId),
    userId: getObjectId(userId),
  });

  if (!file || !fs.existsSync(file.localPath)) throw new Error('File not found');

  if (file.type === 'image') {
    [500, 250, 100].forEach((width) => {
      const thumbnail = imageThumbnail(file.localPath, { width });
      fs.writeFileSync(`${file.localPath}_${width}`, thumbnail);
    });

    console.log(`Thumbnail created for file ${fileId}`);
  } else {
    console.log(`File ${fileId} is not an image`);
  }

  done();
});

// User welcome email queue
usersQue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const user = await UserCollection.findOne({ _id: getObjectId(userId) });
  if (!user) throw new Error('User not found');

  // Printing the welcome email to console
  console.log(`Welcome ${user.email}!`);
  done();
});
