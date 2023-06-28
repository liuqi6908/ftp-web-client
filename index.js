const express = require("express"),
  http = require("http"),
  path = require("path"),
  config = require("config"),
  session = require("express-session"),
  MemoryStore = require("session-memory-store")(session),
  cookieParser = require("cookie-parser");

const server = express();

server.use(express.bodyParser({ limit: "50mb" }));
server.engine("html", require("ejs").renderFile);
server.use(express.static(__dirname + "/public"));
server.use(cookieParser("secret12"));
server.use(express.favicon("favicon.ico"));
console.log("Config name: ", config.name);
server.use(
  session({
    secret: "secret12",
    // create new redis store.
    store: new MemoryStore(),
    saveUninitialized: false,
    resave: false,
  })
);

var consoleHolder = console;
function debug(bool) {
  if (!bool) {
    consoleHolder = console;
    console = {};
    console.log = function () {};
  } else console = consoleHolder;
}
debug(config.debug);
require("./config/routes")(server);

server.use(function (err, req, res, next) {
  console.log("err", err);
  if (err) {
    res.status(err.status || 500).json({ message: err.errors });
  } else {
    res.status(500).json({ message: "something went wrong" });
  }
});
server.get("/", function (req, res, next) {
  res.render(path.join(__dirname + "/index.html"));
});
global.dirname = __dirname;
http.createServer(server).listen(process.env.PORT || config.port, function () {
  console.log("Ftp 客户端监听端口 =====> " + (process.env.PORT || config.port));
});
