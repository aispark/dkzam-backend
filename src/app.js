var fs = require("fs");
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var history = require("connect-history-api-fallback");
const logger = require("morgan");

// var options = {
//   key: fs.readFileSync("./ssl/key.pem"),
//   cert: fs.readFileSync("./ssl/cert.pem")
// };
// var server = require("https").createServer(options, app);

// server.listen(443, function() {
//   console.log(`Socket IO server listening on port 443`);
// });
let port = 80;
if (process.env.NODE_ENV === "production") {
  console.log("Production Mode");
} else if (process.env.NODE_ENV === "development") {
  console.log("Development Mode");
  port = 3000;
}

server.listen(port, function() {
  console.log(`Socket IO server listening on port ${port}`);
});

// http server를 socket.io server로 upgrade한다
// app.io = require("socket.io")(server, { origins: "*:*" });
app.io = require("socket.io")(server);
require("dotenv").config();
require("express-async-errors");

import {
  exportOrder,
  uploadInvoice,
  placeOrder
} from "@/mainComponents/smartStore";
import { alpsUploadOrder, alpsExportInvoice } from "@/mainComponents/alps";
import { importOrder, importInvoice } from "@/mainComponents/excelHandler";

app.use(function(req, res, next) {
  // res.header("Access-Control-Allow-Origin", "https://dkzam.netlify.com");
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
  );
  next();
});
app.use(logger("dev"));

app.use(
  history({
    verbose: true,
    index: `index.html`
  })
);
app.use(express.static("public"));

app.get("/", async (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

//발주확인 처리
app.get("/smartStore/placeOrder", async (req, res) => {
  const result = await placeOrder(req.query.socketId);
  res.send(result);
});

//발주완료 목록
app.get("/smartStore/orderList", async (req, res) => {
  const result = await exportOrder(req.query.socketId);
  res.send(result);
});

//발주완료 목록 등록
app.get("/alps/uploadOrder", async (req, res) => {
  const result = await alpsUploadOrder(req.query);
  res.send(result);
});

//발주완료 목록 파일 import
app.get("/smartStore/importOrderList", async (req, res) => {
  const result = await importOrder();
  res.send(result);
});

//송장 목록
app.get("/alps/invoiceList", async (req, res) => {
  const result = await alpsExportInvoice(req.query.socketId);
  res.send(result);
});

//송장 목록 등록
app.get("/smartStore/uploadInvoice", async (req, res) => {
  const result = await uploadInvoice(req.query);
  res.send(result);
});

//송장 파일 목록
app.get("/alps/importInvoiceList", async (req, res) => {
  const result = await importInvoice();
  res.send(result);
});

// connection이 수립되면 event handler function의 인자로 socket인 들어온다
// app.io.on("connection", async function(socket) {
// 접속한 클라이언트의 정보가 수신되면
// socket.on("processMessage", function(data) {
//   console.log(
//     "Client logged-in:\n name:" + data.name + "\n userid: " + data.userId
//   );
//   // socket에 클라이언트 정보를 저장한다
//   socket.name = data.name;
//   socket.userid = data.userid;
//   // 접속된 클라이언트에게 메시지를 전송한다
//   app.io.emit("processMessage", data.name);
// });

//   socket.on("disconnect", function() {
//     console.log("user disconnected: " + socket.id);
//   });
// });

export default app;
