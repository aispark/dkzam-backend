import { EXPORT_ORDER_PATH, EXPORT_INVOICE_PATH } from "@/constants";
import app from "@/app";
import {
  smartStoreLogin,
  launchPuppeteer,
  getOrderSendManagement,
  waitForClick
} from "@/mainComponents/commonPuppeteer";
import { exportSmartStoreInvoice } from "@/mainComponents/excelHandler";
import XLSX from "xlsx";
import Stopwatch from "statman-stopwatch";
import fs from "fs";

/*
    PRODUCT_ORDER_ID  //상품주문번호
    PRODUCT_ORDER_ADDRESS_NAME //수취인명
    PRODUCT_ORDER_ADDRESS_TELNO1 //수취인연락처1
    PRODUCT_ORDER_ADDRESS_TELNO2 //수취인연락처2
    PRODUCT_ORDER_ADDRESS_ZIPCODE //우편번호
    PRODUCT_ORDER_ADDRESS_ADDRESS //배송지
    OPRODUCT_ORDER_PRODUCT_PRODUCT_NAME //상품명
    OPRODUCT_ORDER_PRODUCT_OPTION_CONTENTS //옵션정보
    PRODUCT_ORDER_DETAIL_ORDER_QUANTITY //수량
    PRODUCT_ORDER_MEMO //메모
*/
function contentMap(content) {
  return content.map(item => {
    const data = {
      productOrderId: item.PRODUCT_ORDER_ID,
      productOrderAddressName: item.PRODUCT_ORDER_ADDRESS_NAME,
      productOrderAddressTelno1: item.PRODUCT_ORDER_ADDRESS_TELNO1,
      productOrderAddressTelno2: item.PRODUCT_ORDER_ADDRESS_TELNO2,
      productOrderAddressZipcode: item.PRODUCT_ORDER_ADDRESS_ZIPCODE,
      productOrderAddressAddress: item.PRODUCT_ORDER_ADDRESS_ADDRESS,
      oproductOrderProductProductName: item.OPRODUCT_ORDER_PRODUCT_PRODUCT_NAME,
      oproductOrderProductOptionContents:
        item.OPRODUCT_ORDER_PRODUCT_OPTION_CONTENTS,
      productOrderDetailOrderQuantity: item.PRODUCT_ORDER_DETAIL_ORDER_QUANTITY,
      productOrderMemo: item.PRODUCT_ORDER_MEMO
    };
    return data;
  });
}

async function placeOrder(socketId) {
  const logChannel = "orderProcess:log";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(logChannel, `발주확인 시작 ${sw.read(0) / 1000} seconds`);

  //puppeteer 초기화
  const browser = await launchPuppeteer();

  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fsell.smartstore.naver.com%2F%23%2FnaverLoginCallback%3Furl%3Dhttps%253A%252F%252Fsell.smartstore.naver.com%252F%2523"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    //로그인
    await smartStoreLogin(page);

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await navigationPromise;

    const frame_71 = await getOrderSendManagement(page);
    sendLog(logChannel, `발주/발송관리 화면 이동 ${sw.read(0) / 1000} seconds`);

    await waitForClick(
      frame_71,
      ".npay_status_list > ._summaryNEW_ORDERS > .status_filtering > .number > ._newOrdersCnt"
    );

    sendLog(logChannel, `신규주문 클릭 ${sw.read(0) / 1000} seconds`);

    const finalResponse = await page.waitForResponse(
      response =>
        response.url() ===
          "https://sell.smartstore.naver.com/o/n/sale/delivery/json" &&
        response.status() === 200
    );

    const {
      htReturnValue: {
        pagedResult: { content, totalElements }
      }
    } = await finalResponse.json();

    //그리드 전체선택
    await waitForClick(
      frame_71,
      ".xhdr > .hdr > tbody > tr > td > .hdrcell > input"
    );
    await page.waitFor(200);

    page.on("dialog", async dialog => {
      sendLog(logChannel, `${dialog.message()} ${sw.read(0) / 1000} seconds`);
      await dialog.accept();
      sendLog(
        logChannel,
        `발주버튼 클릭 ( ${totalElements}건 ) ${sw.read(0) / 1000} seconds`
      );
      await browser.close();
    });

    //발주확인 버튼 클릭
    await waitForClick(
      frame_71,
      ".napy_sub_content > .npay_section > .npay_button_major > .left_box > button:nth-child(1)"
    );

    return { message: "성공", status: 200, resultList: contentMap(content) };
  } catch (error) {
    console.log(error);
    await browser.close();
    return {
      message: "오류 발생",
      status: 500,
      resultList: [],
      error: error
    };
  }
}

async function uploadInvoice(param) {
  const socketId = param.socketId;
  const logChannel = "invoiceProcess:log";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(
    logChannel,
    `발주확인 완료 목록 등록 시작 ${sw.read(0) / 1000} seconds`
  );

  //puppeteer 초기화
  const browser = await launchPuppeteer();

  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fsell.smartstore.naver.com%2F%23%2FnaverLoginCallback%3Furl%3Dhttps%253A%252F%252Fsell.smartstore.naver.com%252F%2523"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    await smartStoreLogin(page);

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await navigationPromise;

    const frame_71 = await getOrderSendManagement(page);
    sendLog(logChannel, `발주/발송관리 화면 이동 ${sw.read(0) / 1000} seconds`);

    browser.on("targetcreated", async target => {
      try {
        // This block intercepts all new events
        if (target.type() === "page") {
          // if it tab/page
          const popup = await target.page(); // declare it

          //엑셀일괄 발송 팝업
          if (
            popup.url() ===
            "https://sell.smartstore.naver.com/o/sale/delivery/batchDispatchPop"
          ) {
            const [fileChooser] = await Promise.all([
              popup.waitForFileChooser({ timeout: 10000 }),
              popup.click(".browse-button") // some button that triggers file selection
              // popup.click("#uploadedFile") // some button that triggers file selection
            ]);

            const dest = `${process.cwd()}/${new Date().getTime()}.xlsx`;
            await exportSmartStoreInvoice(dest, param.items);
            await fileChooser.accept([dest]);
            await popup.waitFor(2000);

            //엑셀일괄 submit
            await waitForClick(popup, ".btn_b");

            await popup.waitFor(2000);

            const msgBox = await popup.$("._successList .result_txt");
            const text = await popup.evaluate(
              msgBox => msgBox.textContent,
              msgBox
            );

            fs.unlink(dest, err =>
              console.log("smartstore invoice temp file delete", err)
            );

            sendLog(logChannel, `${text} ${sw.read(0) / 1000} seconds`);
          }
        }
      } catch (error) {
        console.log("popup error", error);
      } finally {
        await browser.close();
      }
    });

    //엑셀 일괄발송
    await waitForClick(
      frame_71,
      ".npay_button_major > .left_box > .npay_btn_common:nth-child(3)"
    );

    await navigationPromise;

    sendLog(logChannel, `엑셀 일괄발송 팝업 오픈 ${sw.read(0) / 1000} seconds`);

    // console.log("엑셀일괄발송 완료", sw.read(0) / 1000, "seconds");
    return { message: "성공", status: 200 };
  } catch (error) {
    console.log(error);
    await browser.close();
    return {
      message: "오류 발생",
      status: 500,
      resultList: [],
      error: error
    };
  }
}

//스마트 스토어 발주완료 목록을 excel 파일로 export한다.
async function exportOrder(socketId) {
  const logChannel = "orderProcess:log";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(logChannel, `발주확인 완료 시작 ${sw.read(0) / 1000} seconds`);

  const browser = await launchPuppeteer();

  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fsell.smartstore.naver.com%2F%23%2FnaverLoginCallback%3Furl%3Dhttps%253A%252F%252Fsell.smartstore.naver.com%252F%2523"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    await smartStoreLogin(page);

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await navigationPromise;

    const frame_71 = await getOrderSendManagement(page);
    sendLog(logChannel, `발주/발송관리 화면 이동 ${sw.read(0) / 1000} seconds`);

    await waitForClick(
      frame_71,
      ".npay_status_list > ._summaryDELIVERY_READY > .status_filtering > .number > ._deliveryReadyCnt"
    );

    sendLog(logChannel, `발주확인 완료 클릭 ${sw.read(0) / 1000} seconds`);

    const finalResponse = await page.waitForResponse(
      response =>
        response.url() ===
          "https://sell.smartstore.naver.com/o/n/sale/delivery/json" &&
        response.status() === 200
    );

    const {
      htReturnValue: {
        pagedResult: { content }
      }
    } = await finalResponse.json();

    let orderList = contentMap(content);

    /* make the worksheet */
    const ws = XLSX.utils.json_to_sheet(orderList);

    /* add to workbook */
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "sheet0");

    /* generate an XLSX file */
    XLSX.writeFile(wb, EXPORT_ORDER_PATH);

    sendLog(
      logChannel,
      `발주확인 목록 ${EXPORT_ORDER_PATH} export!!! ${sw.read(0) /
        1000} seconds`
    );

    orderList = orderList.map((item, index) => {
      item.no = index + 1;
      return item;
    });

    return { message: "성공", status: 200, resultList: orderList };
  } catch (error) {
    console.log(error);
    return {
      message: "오류 발생",
      status: 500,
      resultList: [],
      error: error
    };
  } finally {
    await browser.close();
  }
}

export { exportOrder, uploadInvoice, placeOrder };
