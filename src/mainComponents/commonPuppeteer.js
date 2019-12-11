import puppeteer from "puppeteer";

let executablePath =
  "node_modules/puppeteer/.local-chromium/win64-706915/chrome-win/chrome.exe";

if (process.env.NODE_ENV === "production")
  executablePath = `${__dirname}/${executablePath}`;

// const executablePath =
//   "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe";

//waitForSelector와 click을 하나로
async function waitForClick(page, selector) {
  await page.waitForSelector(selector);
  await page.click(selector);
}
//발주/발송관리 frame
async function getOrderSendManagement(page) {
  await waitForClick(
    page,
    ".scroller > div > .metisMenu > li:nth-child(2) > a"
  );

  await waitForClick(
    page,
    ".metisMenu > .active > .submenu > li:nth-child(4) > a"
  );

  await page.waitFor(3000);

  let frames = await page.frames();

  return frames.find(f => {
    return f.url() === "https://sell.smartstore.naver.com/o/n/sale/delivery";
  });
}

//스마트스토어 로그인
async function smartStoreLogin(page) {
  await waitForClick(page, ".login_form #id");
  await page.type(".login_form #id", process.env.VUE_APP_NAVER_ID);

  await waitForClick(page, ".login_form #pw");
  await page.type(".login_form #pw", process.env.VUE_APP_NAVER_PASSWORD);

  await waitForClick(
    page,
    "#container > #content > #frmNIDLogin > .login_form > .btn_global"
  );
}

//롯데택배 로그인
async function alpsLogin(page) {
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
}

//퍼펫티어 초기화
async function launchPuppeteer(options) {
  return await puppeteer.launch({
    // executablePath,
    // headless: false,
    slowMo: 20,
    args: [
      // "--start-maximized", // you can also use '--start-fullscreen'
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });
}
export {
  smartStoreLogin,
  launchPuppeteer,
  getOrderSendManagement,
  waitForClick,
  alpsLogin
};
