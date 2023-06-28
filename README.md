# FTP 客户端

基于 [Web Ftp Client](https://github.com/sunilmore690/web-ftp-client) 二次开发的 Ftp Web 客户端。

用户可在浏览器中访问该网页，连接远程 FTP 服务器，浏览文件并执行几乎所有的文件操作。

## 功能

- 新建、删除、重命名、下载、上传 等文件操作
- 新建、删除、重命名 等目录操作

## 依赖

该项目使用了一些开源项目才能正常工作：

- [node.js] - 后端的事件 I/O
- [Express] - 快速的 node.js 网络应用框架
- [Backbonejs] - 前端 MVC 框架
- [Handlebars] - 很棒的模板引擎
- [Twitter Bootstrap] - 适用于现代 Web 应用程序的出色 UI 样板
- [jQuery] - 一个轻量级、“少写，多做”的 JavaScript 库

## 部署网址

[FTP 客户端](http://10.10.10.4:3000/)

## github

[ftp-client](https://github.com/liuqi6908/ftp-client/)

## 下载运行

该项目需要 [Node.js](https://nodejs.org/) v4+ 才能运行。

```plaintext
git clone https://github.com/liuqi6908/ftp-client.git
cd ftp-client
npm install
npm start 或 node index.js
```

## 注意事项

### 上传文件

上传文件时使用 `$.ajax()` 携带 formData 参数发送 post 请求，但在新版本的 Node.js 中可能会出现报错：

`TypeError: os.tmpDir is not a function`

这是因为在新版本的 Node.js 中 `os.tmpDir()` 已被弃用，要找到指定位置将其修改为 `os.tmpdir()`
