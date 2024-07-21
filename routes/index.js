import AppController from '../controllers/AppController';
import FilesController from '../controllers/FilesController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';

function routes(app) {
  app.post('/users', UsersController.postNew);
  app.put('/files/:id/publish', FilesController.putPublish);
  app.put('/files/:id/unpublish', FilesController.putUnpublish);
  app.get('/files/:id', FilesController.getShow);
  app.get('/connect', AuthController.getConnect);
  app.get('/disconnect', AuthController.getDisconnect);
  app.get('/users/me', UsersController.getMe);
  app.post('/files', FilesController.postUpload);
  app.get('/status', AppController.getStatus);
  app.get('/files', FilesController.getIndex);
  app.get('/stats', AppController.getStats);
  app.get('/files/:id/data', FilesController.getFile);
}

module.exports = routes;
export default routes;
