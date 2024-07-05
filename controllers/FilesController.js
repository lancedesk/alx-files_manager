const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const mime = require('mime-types');
const { promisify } = require('util');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');
const Bull = require('bull');
const imageThumbnail = require('image-thumbnail');

const writeFileAsync = promisify(fs.writeFile);
const fileQueue = new Bull('fileQueue');


class FilesController {
    static async postUpload(req, res)
    {
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        const token = req.headers['x-token'];
        if (!token)
        {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId)
        {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!name)
        {
            return res.status(400).json({ error: 'Missing name' });
        }

        if (!type || !['folder', 'file', 'image'].includes(type))
        {
            return res.status(400).json({ error: 'Missing type' });
        }

        if (type !== 'folder' && !data)
        {
            return res.status(400).json({ error: 'Missing data' });
        }

        let parentObjectId = null;
        if (parentId !== 0)
        {
            try
            {
                parentObjectId = dbClient.ObjectId(parentId);
            }
            catch (err)
            {
                return res.status(400).json({ error: 'Parent not found' });
            }
            const parentFile = await dbClient.db.collection('files').findOne({ _id: parentObjectId });
            if (!parentFile)
            {
                return res.status(400).json({ error: 'Parent not found' });
            }
            if (parentFile.type !== 'folder')
            {
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

        if (type === 'folder')
        {
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
        if (!fs.existsSync(folderPath))
        {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const fileId = uuidv4();
        const localPath = path.join(folderPath, fileId);

        if (type === 'file' || type === 'image')
        {
            try
            {
                const fileData = Buffer.from(data, 'base64');
                await writeFileAsync(localPath, fileData);
                newFile.localPath = localPath;
            }
            catch (error)
            {
                return res.status(500).json({ error: 'Error processing file' });
            }
        }

        const result = await dbClient.db.collection('files').insertOne(newFile);

        if (type === 'image')
        {
            fileQueue.add({ userId, fileId });
        }

        return res.status(201).json({
            id: result.insertedId,
            userId: userId,
            name,
            type,
            isPublic,
            parentId: parentId,
            localPath: newFile.localPath,
        });
    }

    static async getShow(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.id;
        let fileObjectId = null;
        try {
            fileObjectId = dbClient.ObjectId(fileId);
        } catch (err) {
            return res.status(404).json({ error: 'Not found' });
        }

        const file = await dbClient.db.collection('files').findOne({ _id: fileObjectId, userId: dbClient.ObjectId(userId) });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        return res.status(200).json(file);
    }

    static async getIndex(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { parentId = 0, page = 0 } = req.query;

        const files = await dbClient.db.collection('files')
            .aggregate([
                { $match: { parentId: parentId === '0' ? 0 : dbClient.ObjectId(parentId), userId: dbClient.ObjectId(userId) } },
                { $skip: page * 20 },
                { $limit: 20 }
            ]).toArray();

        return res.status(200).json(files);
    }

    static async putPublish(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.id;
        let fileObjectId = null;
        try {
            fileObjectId = dbClient.ObjectId(fileId);
        } catch (err) {
            return res.status(404).json({ error: 'Not found' });
        }

        const file = await dbClient.db.collection('files').findOne({ _id: fileObjectId, userId: dbClient.ObjectId(userId) });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        await dbClient.db.collection('files').updateOne({ _id: fileObjectId }, { $set: { isPublic: true } });

        const updatedFile = await dbClient.db.collection('files').findOne({ _id: fileObjectId });
        return res.status(200).json(updatedFile);
    }

    static async putUnpublish(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const fileId = req.params.id;
        let fileObjectId = null;
        try {
            fileObjectId = dbClient.ObjectId(fileId);
        } catch (err) {
            return res.status(404).json({ error: 'Not found' });
        }

        const file = await dbClient.db.collection('files').findOne({ _id: fileObjectId, userId: dbClient.ObjectId(userId) });
        if (!file) {
            return res.status(404).json({ error: 'Not found' });
        }

        await dbClient.db.collection('files').updateOne({ _id: fileObjectId }, { $set: { isPublic: false } });

        const updatedFile = await dbClient.db.collection('files').findOne({ _id: fileObjectId });
        return res.status(200).json(updatedFile);
    }

    static async getFile(req, res)
    {
        const token = req.headers['x-token'];
        const fileId = req.params.id;
        const size = req.query.size;

        let fileObjectId;

        if (!fileId)
        {
            return res.status(404).json({ error: 'Not found' });
        }

        try
        {
            fileObjectId = dbClient.ObjectId(fileId);
        }
        catch (err)
        {
            return res.status(404).json({ error: 'Not found' });
        }

        const file = await dbClient.db.collection('files').findOne({ _id: fileObjectId });
        
        if (!file)
        {
            return res.status(404).json({ error: 'Not found' });
        }

        if (file.isPublic === false)
        {
            if (!token)
            {
                return res.status(404).json({ error: 'Not found' });
            }

            const userId = await redisClient.get(`auth_${token}`);
            if (!userId || userId !== file.userId.toString())
            {
                return res.status(404).json({ error: 'Not found' });
            }
        }

        if (file.type === 'folder')
        {
            return res.status(400).json({ error: "A folder doesn't have content" });
        }

        let filePath = file.localPath;
        if (size)
        {
            filePath = `${file.localPath}_${size}`;
        }

        if (!fs.existsSync(filePath))
        {
            return res.status(404).json({ error: 'Not found' });
        }

        const mimeType = mime.lookup(file.name) || 'application/octet-stream';
        const fileContent = fs.readFileSync(filePath);

        res.setHeader('Content-Type', mimeType);
        res.send(fileContent);
    }
}

module.exports = FilesController;
