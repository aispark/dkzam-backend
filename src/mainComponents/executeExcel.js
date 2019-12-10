const XLSX = require("xlsx");
const workbook = XLSX.readFile(
  "C:/Users/park/Downloads/SettleCaseByCase (26).xlsx"
);

let resultList = [];
workbook.SheetNames.forEach(function(sheetName) {
  let resultList = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
  resultList = resultList.filter(item => item.정산구분 === "정산");
  resultList = resultList.map((item, index) => {
    let data = {
      No: index + 1,
      상품주문번호: item.상품주문번호,
      상품명: item.상품명,
      구매자명: item.구매자명,
      "결제금액 정산완료일": item["결제금액 정산완료일"],
      결제금액: item.결제금액,
      정산예정금액: item.정산예정금액
    };
    if (item.구분 === "배송비") data.원가 = 2500;
    return data;
  });

  /* make the worksheet */
  const ws = XLSX.utils.json_to_sheet(resultList);

  /* add to workbook */
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sheet0");

  /* generate an XLSX file */
  XLSX.writeFile(wb, "C:/Users/park/Downloads/11월정산2.xlsx");
});
