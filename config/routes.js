var ftpsController = require("../api/controllers/ftps_controller");

const isLoggedin = function (req, res, next) {
  if (req.session.ftp) {
    return next();
  } else
    return next({ errors: ["Unauthorized, please log in again"], status: 401 });
};

module.exports = function (app) {
  app.post("/api/ftp/connect", ftpsController.connect);
  app.get("/api/isloggedin", function (req, res, next) {
    if (req.session.ftp) res.json(req.session.ftp);
    else res.status(401).json({ loggedin: false });
  });
  app.post("/api/ftp/logout", function (req, res, next) {
    delete req.session.destroy();
    res.json({ success: true });
  });
  app.post("/api/ftp/list", isLoggedin, ftpsController.list);
  app.post("/api/ftp/download", isLoggedin, ftpsController.download);
  app.post("/api/ftp/rename", isLoggedin, ftpsController.rename);
  app.post("/api/ftp/move", isLoggedin, ftpsController.move);
  app.post("/api/ftp/copy", isLoggedin, ftpsController.copy);
  app.post("/api/ftp/mkdir", isLoggedin, ftpsController.mkdir);
  app.post("/api/ftp/newFile", isLoggedin, ftpsController.newFile);
  app.post("/api/ftp/upload", isLoggedin, ftpsController.upload);
  app.post("/api/ftp/deleteFile", isLoggedin, ftpsController.deleteFile);
  app.post("/api/ftp/deleteFolder", isLoggedin, ftpsController.deleteFolder);
};
