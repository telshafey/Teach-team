import { stringify } from "csv-stringify/browser/esm/sync";

export const downloadCSV = (
  headers: string[],
  data: any[][],
  filename: string,
) => {
  // Add headers as the first row of data
  const csvData = [headers, ...data];

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = "\uFEFF";
  const csvString = stringify(csvData);

  const blob = new Blob([BOM + csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
