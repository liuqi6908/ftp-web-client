var _ = require("lodash"),
  Jsftp = require("jsftp"),
  Buffer = require("buffer").Buffer,
  mime = require("mime"),
  stream = require("stream"),
  fs = require("fs"),
  async = require("async");

/** 退出连接 */
function quitConn(myFtp) {
  myFtp.raw.quit(function (err, data) {
    if (err) return console.error(err);
    console.log("Bye!");
  });
}

/** 格式化错误信息 */
function formatError(message) {
  const regex = /^\d+\s(.*)$/;
  return message.replace(regex, "$1") || message;
}

/** ftp接口 */
var ftps = {};

/** 获取cookie */
function getCookie(name, cookies) {
  var list = {},
    rc = cookies;
  rc &&
    rc.split(";").forEach(function (cookie) {
      var parts = cookie.split("=");
      list[parts.shift().trim()] = decodeURI(parts.join("="));
    });
  return list[name];
}

/** 连接ftp */
ftps.connect = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.body);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }

  ftp.on("error", (err) => {
    quitConn(ftp);
    res.status(500).json({ message: formatError(err.message), code: err.code });
  });

  ftp.auth(req.body.user, req.body.pass, function (err, data) {
    quitConn(ftp);
    if (err || !data || data.isError)
      res
        .status(500)
        .json({ message: formatError(err?.message), code: err.code });
    else {
      req.session.ftp = req.body;
      res.json(req.body);
    }
  });
};

/** 上传文件 */
ftps.upload = function (req, res, next) {
  var files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }

  async.eachSeries(
    files,
    function (file, callback) {
      var filePath = file.path;
      var filename = file.originalFilename;
      var fileData = fs.readFileSync(filePath);
      ftp.put(fileData, req.body.dir + filename, function (hadError) {
        if (hadError) callback(hadError);
        else callback();
      });
    },
    function (err) {
      quitConn(ftp);
      if (err)
        res
          .status(500)
          .json({ message: formatError(err.message), code: err.code });
      else res.json({ message: "Upload success" });
    }
  );
};

/** 获取文件列表 */
ftps.list = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  ftp.ls(req.body.dir || "/", function (err, files) {
    quitConn(ftp);
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else {
      files = _.sortBy(files, function (file) {
        return -file.type;
      });
      files = _.map(files, function (file) {
        file.time = new Date(file.time);
        var perm = "";
        ["userPermissions", "groupPermissions", "otherPermissions"].forEach(
          function (permission_type) {
            if (file.hasOwnProperty(permission_type)) {
              ["read", "write", "exec"].forEach(function (permission) {
                var keyword;
                if (permission == "read") keyword = "r";
                else if (permission == "write") keyword = "w";
                else keyword = "x";
                if (file[permission_type][permission]) perm += keyword;
                else perm += "-";
              });
            }
          }
        );
        if (file.type != 0) {
          file.type = "Directory";
        } else {
          file.type = "File";
        }
        file.perm = perm;
        return file;
      });
      var currentDir = req.body.dir || "/";
      currentDir = currentDir.split("/");

      res.json({ ftpdirlist: files, dirs: currentDir });
    }
  });
};

/** 下载文件 */
ftps.download = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }

  req.body.path =
    req.body.path.charAt(req.body.path.length - 1) == "/"
      ? req.body.path
      : req.body.path + "/";

  ftp.on("error", (err) => {
    quitConn(ftp);
    res.status(500).json({ message: formatError(err.message), code: err.code });
  });

  ftp.get(req.body.path + req.body.name, (err, socket) => {
    quitConn(ftp);
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else {
      const type = mime.lookup(req.body.name);
      const chunks = [];

      socket.on("data", (data) => {
        chunks.push(data);
      });

      socket.on("close", () => {
        const buffer = Buffer.concat(chunks);
        // 返回文件二进制字符串
        res.send(buffer.toString("binary"));
      });

      socket.resume();
    }
  });
};

/** 重命名 */
ftps.rename = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  var from = req.body.path + req.body.source;
  var to = req.body.path + req.body.dest;
  ftp.rename(from, to, function (err, data) {
    quitConn(ftp);
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else res.json({ message: "Rename success" });
  });
};

/** 新建目录 */
ftps.mkdir = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  ftp.raw.mkd(req.body.dir, function (err, data) {
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else res.json({ message: "Created directory success" });
  });
};

/** 新建文件 */
ftps.newFile = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }

  var emptyFile = stream.Readable();
  emptyFile.push(null);

  ftp.put(emptyFile, req.body.dir, function (err) {
    quitConn(ftp);
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else res.json({ message: "Created file success" });
  });
};

/** 删除文件 */
ftps.deleteFile = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  ftp.raw.dele(req.body.path + req.body.name, function (err, data) {
    if (err)
      res
        .status(500)
        .json({ message: formatError(err.message), code: err.code });
    else res.json({ message: "Deleted success" });
  });
};

/** 删除文件夹 */
ftps.deleteFolder = async function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
    deleteFolder(ftp, req.body.path)
      .then(() => {
        res.json({ message: "Deleted success" });
      })
      .catch((err) => {
        res
          .status(500)
          .json({ message: formatError(err.message), code: err.code });
      })
      .finally(() => {
        quitConn(ftp);
      });
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
};

function deleteFolder(ftp, path) {
  return new Promise((resolve, reject) => {
    ftp.ls(path + "/", async (err, files) => {
      if (err) return reject(err);

      var len = files?.length || 0;
      // 如果目录为空直接删除
      if (len === 0) {
        ftp.raw.rmd(path, (err) => {
          if (err) reject(err);
          else resolve();
        });
        return;
      }

      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        const filePath = `${path}/${file.name}`;

        if (file.type != 0) {
          // 递归删除子文件夹
          await deleteFolder(ftp, filePath)
            .then(() => {
              len--;
              if (len === 0) {
                // 子文件夹删除完成后删除当前文件夹
                console.log("2删除文件夹" + path);
                ftp.raw.rmd(path, (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              }
            })
            .catch((err) => reject(err));
        } else {
          // 删除文件
          ftp.raw.dele(filePath, (err) => {
            if (err) reject(err);
            else {
              len--;
              if (len === 0) {
                // 所有文件删除完成后删除当前文件夹
                ftp.raw.rmd(path, (err) => {
                  if (err) reject(err);
                  else resolve();
                });
              }
            }
          });
        }
      }
    });
  });
}

// TODO 移动文件
ftps.move = function () {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  var from = req.body.sourcePath + req.body.sourceFile;
  var to = req.body.sourcePath + req.body.destFile;
  ftp.rename(from, to, function (err, res) {
    quitConn(ftp);
    if (err) return next(err);
    else res.json({ message: "Rename successful" });
  });
};

// TODO 复制文件
ftps.copy = function (req, res, next) {
  try {
    var ftp = new Jsftp(req.session.ftp);
  } catch (e) {
    console.log("err", e);
    return next({ errors: [e], status: 500 });
  }
  if (!req.body.sourcePath) {
    return next({ errors: ["source path "] });
  } else if (!req.body.destPath) {
    return next({ errors: ["source path "] });
  } else if (req.body.sourcePath == req.body.destPath) {
    return next({ errors: ["Source path & dest path could not be same"] });
  }
  var uniquekey = getCookie("connect.sid", req.headers.cookie);
  var localFilePath = "./temp/" + uniquekey + "_" + req.body.name;
  ftp.get(
    req.body.sourcePath + req.body.name,
    localFilePath,
    function (err, socket) {
      if (err) {
        quitConn(ftp);
        return next(err);
      } else {
        ftp.put(
          localFilePath,
          req.body.destPath + req.body.name,
          function (err) {
            quitConn(ftp);
            if (err) return next(err);
            else res.json({ message: "Copied File Successfully" });
            fs.unlinkSync(localFilePath);
          }
        );
      }
    }
  );
};

module.exports = ftps;
