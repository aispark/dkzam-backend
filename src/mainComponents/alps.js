import { EXPORT_ORDER_PATH, EXPORT_INVOICE_PATH } from "@/constants";
import app from "@/app";
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const Stopwatch = require("statman-stopwatch");
import { importInvoice } from "@/mainComponents/excelHandler";

let executablePath =
  "node_modules/puppeteer/.local-chromium/win64-706915/chrome-win/chrome.exe";

if (process.env.NODE_ENV === "production")
  executablePath = `${__dirname}/${executablePath}`;

//alps 송장 export
async function alpsExportInvoice() {
  const logChannel = "process:log";
  const sendLog = (channel, message) => app.io.emit(channel, message);

  const sw = new Stopwatch(true);

  sendLog(logChannel, `송장 가져오기 시작 ${sw.read(0) / 1000} seconds`);

  const browser = await puppeteer.launch({
    // headless: false,
    executablePath,
    slowMo: 20,
    args: [
      "--start-maximized" // you can also use '--start-fullscreen'
    ]
  });
  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://partner.alps.llogis.com/main/pages/sec/authentication"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await navigationPromise;
    sendLog(logChannel, `로그인 시작 ${sw.read(0) / 1000} seconds`);

    await page.waitForSelector(".login_form > ul > .ID > #principal > .input");
    await page.click(".login_form > ul > .ID > #principal > .input");
    await page.type(
      ".login_form > ul > .ID > #principal > .input",
      process.env.VUE_APP_ALPS_ID
    );

    await page.waitForSelector(
      ".login_form > ul > .Password > #credential > .input"
    );
    await page.click(".login_form > ul > .Password > #credential > .input");
    await page.type(
      ".login_form > ul > .Password > #credential > .input",
      process.env.VUE_APP_ALPS_PASSWORD
    );

    await page.waitForSelector(".login_box #btn-login");
    await page.click(".login_box #btn-login");

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await page.waitFor(2000);
    await page.waitForSelector("header > nav > .row [text='집배달']");
    await page.click("header > nav > .row [text='집배달']");

    await page.waitFor(2000);

    sendLog(logChannel, `대메뉴 집배달 클릭 ${sw.read(0) / 1000} seconds`);

    await page.waitForSelector(
      ".subMenuContent > .row:nth-child(4) > .col-3:nth-child(1) > ul > li:nth-child(1) > .menuLeaf"
    );
    await page.click(
      ".subMenuContent > .row:nth-child(4) > .col-3:nth-child(1) > ul > li:nth-child(1) > .menuLeaf"
    );

    await page.waitFor(5000);

    sendLog(logChannel, `통합 운송장 관리 클릭 ${sw.read(0) / 1000} seconds`);

    let frames = await page.frames();
    const frame_904 = frames.find(f => {
      // console.log("f.url()", f.url());
      return f.url().indexOf("/pid/pages/pic") > 0;
    });

    // const childFrames = await frame_904.content();
    // console.log("childFrames", childFrames);

    // console.log("frame_904", frame_904);

    await frame_904.waitForSelector(".searchBtnGroup [text='조회']");
    await frame_904.click(".searchBtnGroup [text='조회']");

    const finalResponse = await page.waitForResponse(
      response => response.url().indexOf("/pid/pic/intgmgrinvprnts") > 0
    );

    const { dsRsrvList } = await finalResponse.json();

    // console.log("dsRsrvList", dsRsrvList);

    //더쿠잼 인 데이터만 export 한다.
    const filterList = dsRsrvList.filter(
      item => item.snperNm === "더쿠잼" && item.invPrntYn === "Y"
    );

    const sendList = filterList.map(item => {
      const data = [item.ordNo, "택배,등기,소포", "롯데택배", item.invNo];
      return data;
    });

    const exportList = [
      ["상품주문번호", "배송방법", "택배사", "송장번호"],
      ...sendList
    ];

    const ws = XLSX.utils.aoa_to_sheet(exportList);

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

async function alpsUploadOrder() {
  const logChannel = "process:log";
  const sendLog = (channel, message) => app.io.emit(channel, message);

  const sw = new Stopwatch(true);

  const browser = await puppeteer.launch({
    // headless: false,
    executablePath,
    slowMo: 20,
    args: [
      "--start-maximized" // you can also use '--start-fullscreen'
    ]
  });
  try {
    const page = await browser.newPage();

    const navigationPromise = page.waitForNavigation();

    await page.goto(
      "https://partner.alps.llogis.com/main/pages/sec/authentication"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    await page.waitForSelector(".login_form > ul > .ID > #principal > .input");
    await page.click(".login_form > ul > .ID > #principal > .input");
    await page.type(
      ".login_form > ul > .ID > #principal > .input",
      process.env.VUE_APP_ALPS_ID
    );

    await page.waitForSelector(
      ".login_form > ul > .Password > #credential > .input"
    );
    await page.click(".login_form > ul > .Password > #credential > .input");
    await page.type(
      ".login_form > ul > .Password > #credential > .input",
      process.env.VUE_APP_ALPS_PASSWORD
    );

    await page.waitForSelector(".login_box #btn-login");
    await page.click(".login_box #btn-login");

    sendLog(logChannel, `로그인 완료 ${sw.read(0) / 1000} seconds`);

    await navigationPromise;

    await page.waitFor(2000);
    await page.waitForSelector("header > nav > .row [text='거래처관리']");
    await page.click("header > nav > .row [text='거래처관리']");

    await page.waitFor(2000);

    sendLog(logChannel, `대메뉴 거래처관리 클릭 ${sw.read(0) / 1000} seconds`);

    await page.waitForSelector(
      ".subMenuContent > .row:nth-child(2) > .col-3:nth-child(2) > ul > li:nth-child(2) > .menuLeaf"
    );
    await page.click(
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
    await frame_2032.waitForSelector("#cboUsrFmat01");
    await frame_2032.click("#cboUsrFmat01");
    await page.waitFor(500);
    await page.keyboard.press("ArrowDown");
    await page.waitFor(500);
    await page.keyboard.press(String.fromCharCode(13));

    //타이틀 있음 체크
    await page.waitFor(2000);
    await frame_2032.waitForSelector("#chkTitleYn01 > .label");
    await frame_2032.click("#chkTitleYn01 > .label");

    //합포장처리
    await frame_2032.waitForSelector("#chkBdpkBaseCd01 > .button");
    await frame_2032.click("#chkBdpkBaseCd01 > .button");

    //파일 업로드
    const fileInput = await frame_2032.$("input[type=file]");
    await fileInput.uploadFile(EXPORT_ORDER_PATH);

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
