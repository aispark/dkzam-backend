import { EXPORT_ORDER_PATH, EXPORT_INVOICE_PATH } from "@/constants";
const XLSX = require("xlsx");

//스마트 스토어 발주완료 목록을 excel 파일로 export한다.
async function importOrder() {
  try {
    const workbook = XLSX.readFile(EXPORT_ORDER_PATH);

    let resultList = [];
    workbook.SheetNames.forEach(function(sheetName) {
      resultList = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      resultList = resultList.map((item, index) => {
        item.no = index + 1;
        return item;
      });
    });

    return { message: "성공", status: 200, resultList };
  } catch (error) {
    console.log(error);
    return {
      message: "오류 발생",
      status: 500,
      resultList: [],
      error: error
    };
  }
}

//스마트 스토어 발주완료 목록을 excel 파일로 export한다.
async function importInvoice() {
  try {
    const workbook = XLSX.readFile(EXPORT_INVOICE_PATH);

    let resultList = [];
    workbook.SheetNames.forEach(function(sheetName) {
      resultList = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      resultList = resultList.map((item, index) => {
        const data = {
          no: index + 1,
          orderNo: item.상품주문번호,
          deliveryMethod: item.배송방법,
          deliveryCompany: item.택배사,
          invoiceNo: item.송장번호
        };
        return data;
      });
    });

    return { message: "성공", status: 200, resultList };
  } catch (error) {
    console.log(error);
    return {
      message: "오류 발생",
      status: 500,
      resultList: [],
      error: error
    };
  }
}

export { importOrder, importInvoice };
