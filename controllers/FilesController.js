const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

class FilesController {
    static async postUpload(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { name, type, parentId = 0, isPublic = false, data } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Missing name' });
        }

        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).json({ error: 'Missing type' });
        }

        if (type !== 'folder' && !data) {
            return res.status(400).json({ error: 'Missing data' });
        }

        let parentObjectId = null;
        if (parentId !== 0) {
            try {
                parentObjectId = dbClient.ObjectId(parentId);
            } catch (err) {
                return res.status(400).json({ error: 'Parent not found' });
            }
            const parentFile = await dbClient.db.collection('files').findOne({ _id: parentObjectId });
            if (!parentFile) {
                return res.status(400).json({ error: 'Parent not found' });
            }
            if (parentFile.type !== 'folder') {
                return res.status(400).json({ error: 'Parent is not a folder' });
            }
        }

        const userIdObject = dbClient.ObjectId(userId);
        const newFile = {
            userId: userIdObject,
            name,
            type,
            isPublic,
            parentId: parentObjectId ? parentObjectId : 0,
        };

        if (type === 'folder') {
            const result = await dbClient.db.collection('files').insertOne(newFile);
            return res.status(201).json({
                id: result.insertedId,
                userId: userId,
                name,
                type,
                isPublic,
                parentId: parentId,
            });
        }

        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const localPath = path.join(folderPath, uuidv4());
        const fileData = Buffer.from(data, 'base64');
        fs.writeFileSync(localPath, fileData);

        newFile.localPath = localPath;
        const result = await dbClient.db.collection('files').insertOne(newFile);

        return res.status(201).json({
            id: result.insertedId,
            userId: userId,
            name,
            type,
            isPublic,
            parentId: parentId,
            localPath,
        });
    }
}

module.exports = FilesController;
