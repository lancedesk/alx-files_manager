/* eslint no-console: off */
import Queue from 'bull';
import mongodb from 'mongodb';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import UserCollection from './utils/users';
import FilesCollection from './utils/files';

const filesQue = new Queue('thumbnails');
const usersQue = new Queue('Welcome Email');

function getObjectId(id) {
  return mongodb.ObjectId.isValid(id) ? new mongodb.ObjectId(id) : '';
}

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

usersQue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) throw new Error('Missing userId');

  const user = await UserCollection.findOne({ _id: getObjectId(userId) });

  if (!user) throw new Error('User not found');

  console.log(`Welcome ${user.email}!`);

  done();
});
