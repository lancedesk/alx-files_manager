const Bull = require('bull');
const fs = require('fs');
const path = require('path');
const imageThumbnail = require('image-thumbnail');
const dbClient = require('./utils/db');
const nodemailer = require('nodemailer');

// Initialize Bull queues
const fileQueue = new Bull('fileQueue');
const userQueue = new Bull('userQueue');

// File processing queue
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

// User welcome email queue
userQueue.process(async (job) => {
    const { userId } = job.data;

    if (!userId) throw new Error('Missing userId');

    const user = await dbClient.db.collection('users').findOne({ _id: dbClient.ObjectId(userId) });
    if (!user) throw new Error('User not found');

    // Printing the welcome email to console
    console.log(`Welcome ${user.email}!`);
});

userQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed!`);
});

userQueue.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed: ${err.message}`);
});

module.exports = { fileQueue, userQueue };
