import { EXPORT_ORDER_PATH, EXPORT_INVOICE_PATH } from "@/constants";
import app from "@/app";
import puppeteer from "puppeteer";
import XLSX from "xlsx";
import Stopwatch from "statman-stopwatch";
import {
  importInvoice,
  exportSmartStoreOrder
} from "@/mainComponents/excelHandler";
import {
  alpsLogin,
  waitForClick,
  launchPuppeteer
} from "@/mainComponents/commonPuppeteer";
import fs from "fs";

//alps 송장 export
async function alpsExportInvoice(socketId) {
  const logChannel = "invoiceProcess:log";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(logChannel, `송장 가져오기 시작 ${sw.read(0) / 1000} seconds`);

  const browser = await launchPuppeteer();

  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://partner.alps.llogis.com/main/pages/sec/authentication"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    await alpsLogin(page);

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await page.waitFor(2000);

    await waitForClick(page, "header > nav > .row [text='집배달']");

    sendLog(logChannel, `대메뉴 집배달 클릭 ${sw.read(0) / 1000} seconds`);
    await page.waitFor(2000);

    await waitForClick(
      page,
      ".subMenuContent > .row:nth-child(4) > .col-3:nth-child(1) > ul > li:nth-child(1) > .menuLeaf"
    );

    sendLog(logChannel, `통합 운송장 관리 클릭 ${sw.read(0) / 1000} seconds`);

    await page.waitFor(5000);

    let frames = await page.frames();
    const frame_904 = frames.find(f => {
      return f.url().indexOf("/pid/pages/pic") > 0;
    });

    await waitForClick(frame_904, ".searchBtnGroup [text='조회']");

    const finalResponse = await page.waitForResponse(
      response => response.url().indexOf("/pid/pic/intgmgrinvprnts") > 0
    );

    const { dsRsrvList } = await finalResponse.json();

    //더쿠잼 인 데이터만 export 한다.
    const filterList = dsRsrvList.filter(
      item => item.snperNm === "더쿠잼" && item.invPrntYn === "Y"
    );

    // const sendList = filterList.map(item => {
    //   const data = [item.ordNo, "택배,등기,소포", "롯데택배", item.invNo];
    //   return data;
    // });

    let invoiceList = filterList.map(item => {
      const data = [
        String(item.ordNo),
        item.acperNm,
        item.acperTel,
        item.gdsNm,
        String(item.invNo)
      ];
      return data;
    });

    invoiceList = [
      ["상품주문번호", "수취인명", "전화번호", "상품명", "송장번호"],
      ...invoiceList
    ];

    const ws = XLSX.utils.aoa_to_sheet(invoiceList);

    /* add to workbook */
    const wb = XLSX.utils.book_new();
    // XLSX.utils.sheet_add_json(ws, sendList, "발송처리");
    XLSX.utils.book_append_sheet(wb, ws, "발송처리");

    /* generate an XLSX file */
    XLSX.writeFile(wb, EXPORT_INVOICE_PATH, {
      bookType: "xlsx",
      bookSST: "false"
    });

    sendLog(
      logChannel,
      `송장 목록 ${EXPORT_INVOICE_PATH} export!!! ${sw.read(0) / 1000} seconds`
    );

    const { resultList } = await importInvoice();
    return { message: "성공", status: 200, resultList };
  } catch (error) {
    console.log(error);
    return {
      message: "오류 발생",
      status: 500,
      error: error
    };
  } finally {
    await browser.close();
  }
}

//발주확인 완료 등록
async function alpsUploadOrder(param) {
  const socketId = param.socketId;
  const logChannel = "orderProcess:log";
  const sendLog = (channel, message) =>
    app.io.to(`${socketId}`).emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(logChannel, `발주확인 완료 등록 시작 ${sw.read(0) / 1000} seconds`);

  const browser = await launchPuppeteer();

  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://partner.alps.llogis.com/main/pages/sec/authentication"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    await alpsLogin(page);

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await page.waitFor(2000);

    await waitForClick(page, "header > nav > .row [text='거래처관리']");

    await page.waitFor(2000);

    sendLog(logChannel, `대메뉴 거래처관리 클릭 ${sw.read(0) / 1000} seconds`);

    await waitForClick(
      page,
      ".subMenuContent > .row:nth-child(2) > .col-3:nth-child(2) > ul > li:nth-child(2) > .menuLeaf"
    );

    await page.waitFor(3000);

    sendLog(logChannel, `일괄주문접수 클릭 ${sw.read(0) / 1000} seconds`);

    let frames = await page.frames();
    const frame_2032 = frames.find(f => {
      // console.log("f.url()", f.url());
      return f.url().indexOf("/pid/pages/cus") > 0;
    });

    //사용자 파일 설정
    await waitForClick(frame_2032, "#cboUsrFmat01");
    await page.waitFor(500);
    await page.keyboard.press("ArrowDown");
    await page.waitFor(500);
    await page.keyboard.press(String.fromCharCode(13));

    //타이틀 있음 체크
    await page.waitFor(2000);
    await waitForClick(frame_2032, "#chkTitleYn01 > .label");

    //합포장처리
    await waitForClick(frame_2032, "#chkBdpkBaseCd01 > .button");

    //파일 업로드
    const fileInput = await frame_2032.$("input[type=file]");

    const dest = `${process.cwd()}/${new Date().getTime()}`;
    await exportSmartStoreOrder(dest, param.items);
    await fileInput.uploadFile(dest);

    await frame_2032.waitForSelector(".msgBoxContent span");

    const msgBox = await frame_2032.$(".msgBoxContent span");
    const text = await frame_2032.evaluate(
      msgBox => msgBox.textContent,
      msgBox
    );

    sendLog(logChannel, text);
    sendLog(
      logChannel,
      `롯데택배 일괄주문접수 완료!!! ${sw.read(0) / 1000} seconds`
    );

    fs.unlink(dest, err =>
      console.log("smartstore order temp file delete", err)
    );

    return { message: "성공", status: 200 };
  } catch (error) {
    console.log(error);
    return {
      message: "오류 발생",
      status: 500,
      error: error
    };
  } finally {
    await browser.close();
  }
}

export { alpsUploadOrder, alpsExportInvoice };
