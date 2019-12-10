var app = require("express")();
var server = require("http").createServer(app);
var cors = require("cors");
// http server를 socket.io server로 upgrade한다
app.io = require("socket.io")(server, { origins: "*:*" });
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
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,content-type,application/json"
  );
  next();
});

// app.use(cors());

// app.all("/*", function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", "X-Requested-With");
//   next();
// });

app.get("/", async (req, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

//발주완료 목록
app.get("/smartStore/orderList", async (req, res) => {
  const result = await exportOrder(req.query.socketId);
  res.send(result);
});

//발주확인 처리
app.get("/smartStore/placeOrder", async (req, res) => {
  const result = await placeOrder(req.query.socketId);
  res.send(result);
});

// connection event handler
// connection이 수립되면 event handler function의 인자로 socket인 들어온다
app.io.on("connection", async function(socket) {
  console.log("socket.id", socket.id);
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

  // console.log(app.io.sockets);

  socket.on("disconnect", function() {
    console.log("user disconnected: " + socket.id);
  });
});

server.listen(3000, function() {
  console.log("Socket IO server listening on port 3000");
});

export default app;
