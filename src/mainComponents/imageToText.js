import Tesseract from "tesseract.js";
import Stopwatch from "statman-stopwatch";
import app from "@/app";
import fs from "fs";

function recognize(param) {
  const socketId = param.socketId;
  const logChannel = "recognizeProcess:log";
  const succChannel = "recognizeProcess:succ";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);
  //  param.file
  const filePath = `${process.cwd()}/${param.filePath}`;
  Tesseract.recognize(filePath, "kor+eng", {
    logger: m =>
      m.status === "recognizing text"
        ? sendLog(
            logChannel,
            `이미지 파일 변환중 ${(m.progress * 100).toFixed(2)}%`
          )
        : ""
  }).then(({ data: { text } }) => {
    // console.log(text);
    text = text.replace(/ /g, "");
    let arrText = text.split("\n");
    const lineMark = arrText.reduce((preItem, currItem, index) => {
      const preText = preItem[preItem.length - 1];
      if (currItem === "") {
        preItem.push(index);
      }

      return preItem;
    }, []);
    arrText.forEach(item => console.log(item));

    // lineMark.reduce((preItem, currItem) => {
    //   let lineText = arrText.slice(preItem, currItem).join("");
    //   if (lineText.startsWith("상품명"))
    //     console.log(lineText.replace("상품명", ""));
    //   else if (lineText.startsWith("옵션정보"))
    //     console.log(lineText.replace("옵션정보", ""));
    //   else if (lineText.startsWith("주문수량"))
    //     console.log(lineText.replace("주문수량", ""));
    //   else if (lineText.startsWith("수취인명"))
    //     console.log(lineText.replace("수취인명", ""));
    //   else if (lineText.startsWith("배송지주소"))
    //     console.log(lineText.replace("배송지주소", ""));
    //   else if (lineText.startsWith("연락처1"))
    //     console.log(lineText.replace("연락처1", "").replace(/[^\-0-9]/g, ""));
    //   return currItem;
    // });

    sendLog(logChannel, arrText);
    sendLog(succChannel, arrText);

    // 파일 삭제
    fs.unlink(filePath, err =>
      console.log("imageToText temp file delete", err)
    );
  });
}

export { recognize };
