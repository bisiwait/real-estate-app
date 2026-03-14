export {};

declare global {
  interface Window {
    html2canvas: any;
    jspdf: any;
    Chart: any;
    QRCode: any;
  }
}
