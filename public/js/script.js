/** 模板管理 */
var TemplateManager = {
  templates: {}, // holds the templates cache
  get: function (id, callback) {
    var template = this.templates[id];
    if (template) {
      // return the cached version if it exists
      callback(template);
    } else {
      var that = this;
      $.get("/templates/" + id + ".hbs", function (template) {
        that.templates[id] = template;
        callback(that.templates[id]);
      });
    }
  },
};

/** 解析查询字符串 */
function parseQueryString(variable) {
  var query = window.location.search.substring(1);
  var vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}

/** 注册hbs方法 */
/** 筛选 */
Handlebars.registerHelper(
  "when",
  function (operand_1, operator, operand_2, options) {
    var operators = {
        eq: function (l, r) {
          return l == r;
        },
        noteq: function (l, r) {
          return l != r;
        },
        gt: function (l, r) {
          return Number(l) > Number(r);
        },
        or: function (l, r) {
          return l || r;
        },
        and: function (l, r) {
          return l && r;
        },
        "%": function (l, r) {
          return l % r === 0;
        },
      },
      result = operators[operator](operand_1, operand_2);

    if (result) return options.fn(this);
    else return options.inverse(this);
  }
);
/** 格式化日期 */
Handlebars.registerHelper("formattedDate", function (date) {
  var str = new Date(date).toLocaleString();
  return str.substring(0, str.length - 3);
});
/** 根据文件名获取图标 */
Handlebars.registerHelper("fileIcon", function (target) {
  var allowedExtensions = [
    // 文本文件
    "txt",
    // 文档
    "doc",
    "docx",
    "docm",
    "rtf",
    // 表格
    "xls",
    "xlsx",
    "xlsm",
    "csv",
    "ods",
    // 演示文稿
    "ppt",
    "pptx",
    "pptm",
    "pps",
    "ppsx",
    "odp",
    // 图片
    "bmp",
    "gif",
    "jpeg",
    "jpg",
    "png",
    "tiff",
    "tif",
    "svg",
    "ico",
    "psd",
    "ai",
    "eps",
    "raw",
    "webp",
    "heic",
    "heif",
    // 压缩包
    "bz2",
    "dmg",
    "gz",
    "gzip",
    "iso",
    "rar",
    "tar",
    "tgz",
    "zip",
    "zipx",
    "7z",
    "xz",
    "tbz2",
    "txz",
    "lzh",
    "lha",
    "cab",
    // pdf
    "pdf",
    // 音频
    "mp3",
    "wav",
    "aac",
    "flac",
    "ogg",
    "wma",
    "aiff",
    "m4a",
    "mid",
    "midi",
    "ape",
    "amr",
    // 视频
    "mp4",
    "mov",
    "avi",
    "mkv",
    "wmv",
    "flv",
    "mpeg",
    "3gp",
    "rmvb",
    "webm",
    // 代码
    "c",
    "cpp",
    "java",
    "py",
    "html",
    "htm",
    "css",
    "js",
    "php",
    "rb",
    "sql",
    "json",
    "xml",
    "yml",
    "yaml",
    "md",
    "sh",
    "bat",
    "cmd",
    "jar",
    "dll",
    "class",
  ];

  var targetNameParts = target.split(".");
  var extensionPart = targetNameParts.length;
  var extension =
    $.inArray(targetNameParts[extensionPart - 1], allowedExtensions) > -1
      ? targetNameParts[extensionPart - 1]
      : "txt";

  return "fa-file-" + extension + "-o";
});
/** 格式化文件大小 */
Handlebars.registerHelper("humanFileSize", function (bytes) {
  var si = true;
  var thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }
  var units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + " " + units[u];
});

var BaseModel = Backbone.Model.extend({});
var FtpConnect = Backbone.Model.extend({
  urlRoot: "/api/ftp/connect",
  defaults: {
    port: "21",
  },
});
var FtpListModel = Backbone.Model.extend({
  urlRoot: "/api/ftp/list",
  defaults: {
    dir: "/",
  },
});
var renameModel = Backbone.Model.extend({
  urlRoot: "/api/ftp/rename",
});
var deleteModel = Backbone.Model.extend({
  urlRoot: "/api/ftp/deleteFile",
});
var deleteFolder = Backbone.Model.extend({
  urlRoot: "/api/ftp/deleteFolder",
});
var downloadModel = Backbone.Model.extend({
  urlRoot: "/api/ftp/download",
});

/** 加载Ftp列表视图 */
var FtpListView = Backbone.View.extend({
  el: ".page",

  /** 绑定点击事件 */
  events: {
    "click .path": "goToPath",
    "click .back": "back",
    "click .refresh": "render",
    "click .mkdir": "makeDir",
    "click .newFile": "newFile",
    "click .paste": "paste",
    "click .list": "listDirFile",
    "click .action": "Action",
    "click .delete": "delete",
    "contextmenu .list-row": "contextMenu",
  },

  /** 菜单 */
  menu: null,

  /** 初始化 */
  initialize: function () {
    var that = this;
    this.model = new FtpListModel({
      dir: sessionStorage.getItem("currentDir") || "/",
    });
    this.model.on("change:dir", function () {
      window.sessionStorage.setItem("currentDir", that.model.get("dir"));
    });
  },

  /** 渲染视图模板 */
  render: function () {
    var that = this;
    this.model.save(
      {},
      {
        success: function () {
          TemplateManager.get("ftp_list", function (template) {
            var template = Handlebars.compile(template);

            var data = JSON.parse(JSON.stringify(that.model.attributes));
            data.dirs.pop();
            if (data.ftpdirlist) {
              var total = data.ftpdirlist.length;

              var directories = _.filter(data.ftpdirlist, {
                type: "Directory",
              });
              var dirtotal = directories.length;
              var filetotal = total - dirtotal;
              _.extend(
                data,
                { size_info: { total: total, dir: dirtotal, file: filetotal } },
                { isMobile: App.isMobile }
              );
            }
            var html = template(data);
            that.$el.html(html);
            that.postRender();
            that.menu = document.querySelector("#menu");
            // 点击空白区域，隐藏菜单
            document.addEventListener("click", function () {
              that.menu.style.display = "none";
            });
            document.querySelector(".paste").className =
              "btn btn-xs btn-warning paste" +
              (that.model.get("file") ? "" : " disabled");
          });
        }.bind(this),
        error: function (a, jqXHR) {
          window.App.flash(
            jqXHR.responseJSON.message || "Something went wrong",
            "error"
          );
          // 目录没找到，返回上一级
          var dir = that.model.get("dir");
          if (jqXHR.responseJSON.code == 550 && dir != "/") {
            that.back();
          }
        },
      }
    );
  },

  /** 跳转指定路径 */
  goToPath: function (event) {
    var data = $(event.currentTarget).data();
    var dirs = this.model.get("dirs") || [];
    dirs = JSON.parse(JSON.stringify(dirs));
    dirs.pop();
    if (data.index >= 0) {
      var dir = "";
      for (var i = 0; i <= data.index; i++) {
        dir += dirs[i] + "/";
      }
      this.model.set("dir", dir);
      this.render();
    }
  },

  /** 返回上一级 */
  back: function () {
    var dir = this.model.get("dir");
    var dirs = dir.split("/") || [];
    if (dirs.length >= 2) dirs.splice(dirs.length - 2, 2);
    else dirs = [];
    this.model.set("dir", dirs.join("/") + "/");
    this.render();
  },

  /** 新建目录 */
  makeDir: function () {
    var that = this;
    var newdir = prompt("新目录名称", "");
    if (newdir) {
      var dir = this.model.get("dir") + "/" + newdir;
      var request = $.post("/api/ftp/mkdir", { dir: dir });

      request.success(function () {
        window.App.flash("Created directory success", "success");
        that.render();
      });

      request.error(function (jqXHR) {
        window.App.flash(
          jqXHR.responseJSON?.message || "Something went wrong",
          "error"
        );
      });
    }
  },

  /** 新建文件 */
  newFile: function () {
    var that = this;
    var newfile = prompt("新文件名称", "");
    if (newfile) {
      var request = $.post("/api/ftp/newFile", {
        dir: this.model.get("dir") + newfile,
      });

      request.success(function () {
        window.App.flash("Created file success", "success");
        that.render();
      });

      request.error(function (jqXHR) {
        window.App.flash(
          jqXHR.responseJSON?.message || "Something went wrong",
          "error"
        );
      });
    }
  },

  /** 上传文件 */
  postRender: function () {
    var that = this;
    // 自定义submit方法
    var onsubmit = (el) => {
      var formData = new FormData(el);

      var request = $.ajax({
        url: "/api/ftp/upload",
        type: "POST",
        data: formData,
        async: false,
        cache: false,
        contentType: false,
        processData: false,
      });

      request.success(function () {
        window.App.flash("Upload success ", "success");
        that.render();
      });

      request.error(function (jqXHR) {
        window.App.flash(
          jqXHR.responseJSON?.message || "Something went wrong",
          "error"
        );
      });
    };

    // 选中文件后自动提交
    this.$el.find("input:file").change(function (event) {
      onsubmit(event.currentTarget.parentElement.parentElement);
    });
  },

  /** 粘贴文件 */
  paste: function () {
    var file = this.model.get("file");
    if (!file) return;

    var formData = new FormData();
    var that = this;
    formData.append("file", new File([file.blob], file.data.name));
    formData.append("dir", this.model.get("dir"));

    var request = $.ajax({
      url: "/api/ftp/upload",
      type: "POST",
      data: formData,
      async: false,
      cache: false,
      contentType: false,
      processData: false,
    });

    request.success(function () {
      window.App.flash("Paste success ", "success");
      // 剪切，删除原文件
      if (file.type == 2) {
        $.ajax({
          url: "/api/ftp/deleteFile",
          type: "POST",
          data: file.data,
        });
      }
      that.model.set("file", null);
      document.querySelector(".paste").className =
        "btn btn-xs btn-warning paste disabled";
      that.render();
    });

    request.error(function (jqXHR) {
      window.App.flash(
        jqXHR.responseJSON?.message || "Something went wrong",
        "error"
      );
    });
  },

  /** 获取文件列表 */
  listDirFile: function (event) {
    var data = $(event.currentTarget).data();
    if (data.type == "folder") {
      var dir = this.model.get("dirs") || [];
      dir = dir.join("/");
      this.model.set("dir", dir + data.name + "/");
      this.render();
    } else {
      this.download(data.name);
    }
  },

  /** 操作 */
  Action: function (event) {
    var data = $(event.currentTarget).data();
    if (data.action == "rename") this.rename(data.name);
    else if (data.action == "download") this.download(data.name);
  },

  /** 重命名 */
  rename: function (name) {
    var that = this;
    var currentDir = this.model.get("dir") || "/";
    var newfile = prompt("重命名 ", name);

    if (newfile && newfile != name) {
      var rename = new renameModel({
        path: currentDir,
        source: name,
        dest: newfile,
      });
      rename.save(
        {},
        {
          success: function () {
            window.App.flash("Rename success", "success");
            that.render();
          },
          error: function (a, jqXHR) {
            window.App.flash(
              jqXHR.responseJSON?.message || "Something went wrong",
              "error"
            );
          },
        }
      );
    }
  },

  /** 删除 */
  delete: function (event) {
    var data = $(event.currentTarget).data();
    if (data.type == "file") this.deleteFile(data);
    else this.deleteFolder(data);
  },

  /** 删除文件 */
  deleteFile: function (data) {
    if (confirm("确定要删除这个文件吗？ " + data.name) != true) {
      return false;
    }
    var that = this;

    var delete_model = new deleteModel({
      path: this.model.get("dir") || "/",
      name: data.name,
    });
    delete_model.save(
      {},
      {
        success: function () {
          window.App.flash("Delete success", "success");
          that.render();
        },
        error: function (a, jqXHR) {
          window.App.flash(
            jqXHR.responseJSON?.message || "Something went wrong",
            "error"
          );
        },
      }
    );
  },

  /** 删除文件夹 */
  deleteFolder: function (data) {
    if (confirm("确定要删除这个文件夹吗？ " + data.name) != true) {
      return false;
    }
    var that = this;

    var delete_model = new deleteFolder({
      path: (this.model.get("dir") || "/") + data.name,
    });
    delete_model.save(
      {},
      {
        success: function () {
          window.App.flash("Delete success", "success");
          that.render();
        },
        error: function (a, jqXHR) {
          window.App.flash(
            jqXHR.responseJSON?.message || "Something went wrong",
            "error"
          );
        },
      }
    );
  },

  /** 下载文件 */
  download: function (name, type) {
    const that = this;

    var path = this.model.get("dirs") || [];
    path = path.join("/");
    var data = {
      name,
      path,
    };

    var request = $.ajax({
      url: "/api/ftp/download",
      type: "POST",
      data,
      responseType: "arraybuffer",
    });

    request.success(function (result) {
      var blob = new Blob([that.binaryStringToBuffer(result)]);
      if (type) {
        that.model.set("file", {
          blob,
          data,
          type,
        });
        window.App.flash(
          (type == 1 ? "Copy" : "Shear") + " success",
          "success"
        );
        document.querySelector(".paste").className =
          "btn btn-xs btn-warning paste";
      } else {
        saveAs(blob, name);
        window.App.flash("Download success", "success");
      }
    });

    request.error(function (jqXHR) {
      window.App.flash(
        jqXHR.responseJSON?.message || "Something went wrong",
        "error"
      );
    });
  },

  /** 将字符串转为buffer对象 */
  binaryStringToBuffer(binaryStr) {
    const buffer = new ArrayBuffer(binaryStr.length);
    const bufferView = new Uint8Array(buffer);
    for (let i = 0; i < binaryStr.length; i++) {
      bufferView[i] = binaryStr.charCodeAt(i);
    }
    return buffer;
  },

  /** 复制路径 */
  copyPath: function (data) {
    var path =
      this.model.get("dir") + data.name + (data.type == "folder" ? "/" : "");
    var input = document.createElement("textarea");
    input.value = path;
    document.body.appendChild(input);
    input.select();
    document.execCommand("Copy");
    document.body.removeChild(input);
    window.App.flash("Copy success", "success");
  },

  /** 右键菜单 */
  contextMenu: function (event) {
    var that = this;
    event.preventDefault();
    var menu = this.menu,
      style = menu.style;
    style.display = "block";
    if (event.clientX + menu.scrollWidth > window.innerWidth)
      style.left = event.clientX - menu.scrollWidth + "px";
    else style.left = event.clientX + "px";
    if (event.clientY + menu.scrollHeight > window.innerHeight)
      style.top = event.clientY - menu.scrollHeight + "px";
    else style.top = event.clientY + "px";

    var data = $(event.currentTarget).data();
    var ul = menu.getElementsByTagName("ul")[0];

    // 移除所有菜单
    ul.innerHTML = "";

    // 添加菜单
    var arr = [
      {
        type: ["folder"],
        name: "打开",
        click: () => {
          that.listDirFile({
            currentTarget: event.currentTarget.querySelector(".list"),
          });
        },
      },
      {
        type: ["folder", "file"],
        name: "重命名",
        click: () => {
          that.rename(data.name);
        },
      },
      {
        type: ["folder", "file"],
        name: "删除",
        click: () => {
          that.delete({
            currentTarget: event.currentTarget.querySelector(".list"),
          });
        },
      },
      {
        type: ["file"],
        name: "下载",
        click: () => {
          that.download(data.name);
        },
      },
      {
        type: ["file"],
        name: "复制",
        click: () => {
          that.download(data.name, 1);
        },
      },
      {
        type: ["file"],
        name: "剪切",
        click: () => {
          that.download(data.name, 2);
        },
      },
      {
        type: ["folder", "file"],
        name: "复制路径",
        click: () => {
          that.copyPath(data);
        },
      },
    ];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].type.indexOf(data.type) > -1) {
        var li = document.createElement("li");
        li.innerText = arr[i].name;
        // 添加点击事件
        li.addEventListener("click", arr[i].click);
        ul.appendChild(li);
      }
    }
  },
});

/** 加载导航栏视图 */
var NavBarView = Backbone.View.extend({
  el: "nav",

  /** 绑定点击事件 */
  events: {
    "click .signout": "Logout",
  },

  /** 初始化 */
  initialize: function () {},

  /** 渲染视图模板 */
  render: function () {
    TemplateManager.get(
      "navbar",
      function (source) {
        var template = Handlebars.compile(source);
        var html = template({ ftp: window.App.User });
        this.$el.html(html);
      }.bind(this)
    );
  },

  /** 退出登录 */
  Logout: function () {
    var request = $.post("/api/ftp/logout", {});

    request.success(function () {
      window.sessionStorage.removeItem("currentDir");
      window.App.flash("Logout success", "success");
      window.location.reload();
    });

    request.error(function () {
      window.App.flash("Something went wrong", "error");
    });
    return false;
  },
});

/** 加载登录视图 */
var HomeView = Backbone.View.extend({
  el: ".page",

  /** 绑定点击事件 */
  events: {
    "click .login": "Login",
  },

  /** 初始化 */
  initialize: function () {
    this._modelBinder = new Backbone.ModelBinder();
    this.model = new FtpConnect();
  },

  /** 渲染视图模板 */
  render: function () {
    if (window.localStorage.getItem("ftp")) {
      let ftp;
      try {
        ftp = JSON.parse(window.localStorage.getItem("ftp"));
      } catch (e) {
        ftp = {};
      }
      if (ftp.host) ftp.checked = true;
      if (ftp.pass) ftp.pass = window.atob(ftp.pass);
      this.model.set(ftp);
    }

    var that = this;

    TemplateManager.get("home", function (template) {
      var template = Handlebars.compile(template);
      var html = template(that.model.attributes || {});
      that.$el.html(html);
      that.bindModel();
      return false;
    });
  },

  /** 绑定数值 */
  bindModel: function () {
    var bindings = {
      host: "[name=host]",
      user: "[name=user]",
      pass: "[name=pass]",
      port: "[name=port]",
      checked: "[name=checked]",
    };
    this._modelBinder.bind(this.model, this.el, bindings);
  },

  /** 登录 */
  Login: function () {
    var that = this;
    const host = that.model.get("host"),
      user = that.model.get("user"),
      pass = that.model.get("pass"),
      port = that.model.get("port"),
      checked = that.model.get("checked");
    if (!host) return;
    window.sessionStorage.removeItem("currentDir");
    that.model.save(
      {},
      {
        success: function () {
          window.App.User = that.model.attributes;

          // 记住登录凭据
          if (checked)
            window.localStorage.setItem(
              "ftp",
              JSON.stringify({
                host,
                user,
                pass: window.btoa(pass),
                port,
              })
            );
          else window.localStorage.removeItem("ftp");

          window.App.flash("Login success", "success");
          window.location.reload();
        },
        error: function (a, jqXHR) {
          window.App.flash(
            jqXHR.responseJSON.message || "Something went wrong",
            "error"
          );
        },
      }
    );
  },
});

var Router = Backbone.Router.extend({
  routes: {
    "": "home",
    ftplist: "index",
  },
  index: function () {
    if (window.App.User) {
      router.currentView = new FtpListView();
      router.currentView.render();
    } else {
      App.router.navigate("", { trigger: true });
    }
  },
  home: function () {
    if (window.App.User) {
      router.currentView = new FtpListView();
      router.currentView.render();
    } else {
      router.currentView = new HomeView();
      router.currentView.render();
    }
  },
  execute: function (callback, args) {
    if (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    ) {
      App.isMobile = true;
    }
    var that = this;

    window.App.loggedIn(function (err, user) {
      if (!App.navBarView) {
        App.navBarView = new NavBarView();
        App.navBarView.render();
      }
      args.push(parseQueryString(args.pop()));
      if (callback) callback.apply(that, args);
    });
  },
});

var router = new Router();
window.App = window.App || {};
window.App.router = router;
window.App.setLoading = function (loading) {
  $("body").toggleClass("loading", loading);

  if (!loading) {
    $("body").css("overflow-y", "auto");
  } else {
    $("body").css("overflow-y", "hidden");
  }
};
window.App.loggedIn = function (callback) {
  var request = $.get("/api/isloggedin");

  request.success(function (result) {
    window.App.User = result;
    callback(null, result);
  });
  request.error(function (jqXHR, textStatus, errorThrown) {
    callback(errorThrown);
  });
};
window.App.flash = function (message, type) {
  if (type == "error") {
    $.growl.error({
      message: message,
      duration: 1000,
      type: "danger",
    });
  } else {
    $.growl.notice({
      message: message,
      title: "",
      duration: 1000,
    });
  }
};
jQuery.ajaxSetup({
  beforeSend: function () {
    window.App.setLoading(true);
  },
  complete: function () {
    window.App.setLoading(false);
  },
  success: function () {},
});
Backbone.history.start();
