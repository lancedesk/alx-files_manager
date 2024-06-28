const Bull = require('bull');
const fs = require('fs');
const path = require('path');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;

    if (!fileId) throw new Error('Missing fileId');
    if (!userId) throw new Error('Missing userId');

    const file = await dbClient.db.collection('files').findOne({ _id: fileId, userId });
    if (!file) throw new Error('File not found');

    const sizes = [500, 250, 100];
    const fileData = fs.readFileSync(file.localPath);

    for (const size of sizes) {
        const thumbnail = await imageThumbnail(fileData, { width: size });
        const thumbnailPath = `${file.localPath}_${size}`;
        fs.writeFileSync(thumbnailPath, thumbnail);
    }
});

fileQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed!`);
});

fileQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed: ${err.message}`);
});
