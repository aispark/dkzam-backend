import { EXPORT_ORDER_PATH, EXPORT_INVOICE_PATH } from "@/constants";
import XLSX from "xlsx";

//스마트 스토어 발주완료 목록을 import 한다.
async function importOrder() {
  try {
    const workbook = XLSX.readFile(EXPORT_ORDER_PATH);

    let resultList = [];
    workbook.SheetNames.forEach(function(sheetName) {
      resultList = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 0,
        defval: ""
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

async function exportSmartStoreOrder(dest, orderIdList) {
  let { resultList } = await importOrder();
  resultList = resultList.filter(item =>
    orderIdList.some(orderId => orderId === item.productOrderId)
  );

  /* make the worksheet */
  const ws = XLSX.utils.json_to_sheet(resultList);

  /* add to workbook */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sheet0");

  XLSX.writeFile(wb, dest, {
    bookType: "xlsx",
    bookSST: "false"
  });
}

async function exportExternalOrder(dest, orderList) {
  orderList = orderList.map((item, index) => {
    const data = {
      // 주문번호	보내는사람(지정)	전화번호1(지정)	전화번호2(지정)	우편번호(지정)	주소(지정)	받는사람	전화번호1	전화번호2	우편번호	주소	상품명1	상품상세1	수량(A타입)	배송메시지	운임구분
      주문번호: "",
      보내는사람지정: item.dispatcher,
      전화번호1지정: item.dispatcherTel1,
      전화번호2지정: item.dispatcherTel2,
      우편번호지정: item.dispatcherPostNo,
      주소지정: item.dispatcherAddr,
      받는사람: item.productOrderAddressName,
      전화번호1: item.productOrderAddressTelno1,
      전화번호2: "",
      우편번호: item.productOrderAddressZipcode,
      주소: `${item.productOrderAddressAddress} ${item.productOrderAddressAddressDetail}`,
      상품명1: item.oproductOrderProductProductName,
      상품상세1: item.oproductOrderProductProductName,
      수량: item.productOrderDetailOrderQuantity,
      배송메시지: item.productOrderMemo
    };
    return data;
  });

  /* make the worksheet */
  const ws = XLSX.utils.json_to_sheet(orderList);

  /* add to workbook */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sheet0");

  XLSX.writeFile(wb, dest, {
    bookType: "xlsx",
    bookSST: "false"
  });
}

async function exportSmartStoreInvoice(dest, invoiceNoList) {
  let { resultList } = await importInvoice();

  resultList = resultList.filter(item =>
    invoiceNoList.some(invoiceNo => invoiceNo === item.invoiceNo)
  );

  let invoiceList = resultList.map(item => {
    const data = [
      String(item.orderNo),
      "택배,등기,소포",
      "롯데택배",
      String(item.invoiceNo)
    ];
    return data;
  });

  invoiceList = [
    ["상품주문번호", "배송방법", "택배사", "송장번호"],
    ...invoiceList
  ];

  const ws = XLSX.utils.aoa_to_sheet(invoiceList);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "발송처리");

  XLSX.writeFile(wb, dest, {
    bookType: "xlsx",
    bookSST: "false"
  });
}

//롯데택배 송장 목록을 import 한다.
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
          acperNm: item.수취인명,
          acperTel: item.전화번호,
          gdsNm: item.상품명,
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

export {
  importOrder,
  importInvoice,
  exportSmartStoreInvoice,
  exportSmartStoreOrder,
  exportExternalOrder
};
