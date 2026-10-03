import PDFDocument from 'pdfkit';
import { getEnv } from '../config/env.js';

const env = getEnv();

interface RouteMapData {
  distanceKm: number;
  durationMinutes: number;
  fare: number;
  departurePlace: string;
  arrivalPlace: string;
  waypoints: Array<{ name: string }>;
  mapImageUrl?: string;
}

export class PDFService {
  async generateRouteMapPDF(data: RouteMapData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'portrait' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawHeader(doc);
      this.drawRouteInfo(doc, data);
      if (data.mapImageUrl) {
        this.drawMap(doc, data);
      }
      this.drawFooter(doc);

      doc.end();
    });
  }

  private drawHeader(doc: PDFKit.PDFDocument): void {
    doc.fontSize(24).font('Helvetica-Bold').text('自家用車走行距離証明書', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`発行日: ${new Date().toLocaleDateString('ja-JP')}`, { align: 'right' });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);
  }

  private drawRouteInfo(doc: PDFKit.PDFDocument, data: RouteMapData): void {
    const startY = doc.y;

    doc.fontSize(14).font('Helvetica-Bold').text('走行ルート情報', { underline: true });
    doc.moveDown(0.8);

    const info = [
      { label: '出発地', value: data.departurePlace },
      { label: '目的地', value: data.arrivalPlace },
      { label: '走行距離', value: `${data.distanceKm.toFixed(2)} km` },
      { label: '所要時間', value: `${data.durationMinutes} 分` },
      { label: '支給単価', value: `${env.GASOLINE_UNIT_PRICE} 円/km` },
      { label: '支給額', value: `${data.fare.toLocaleString('ja-JP')} 円` },
    ];

    info.forEach((item, index) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`${item.label}: `, { continued: true });
      doc.font('Helvetica').text(item.value);
      if (index < info.length - 1) doc.moveDown(0.3);
    });

    if (data.waypoints.length > 2) {
      doc.moveDown(0.8);
      doc.fontSize(12).font('Helvetica-Bold').text('経由地');
      doc.moveDown(0.3);
      data.waypoints.slice(1, -1).forEach((wp, index) => {
        doc.fontSize(11).font('Helvetica').text(`${index + 1}. ${wp.name}`);
      });
    }

    doc.moveDown(1.5);
  }

  private async drawMap(doc: PDFKit.PDFDocument, data: RouteMapData): Promise<void> {
    if (!data.mapImageUrl) return;

    try {
      const response = await fetch(data.mapImageUrl);
      if (!response.ok) throw new Error('Map image fetch failed');
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      doc.fontSize(12).font('Helvetica-Bold').text('ルート地図', { underline: true });
      doc.moveDown(0.5);

      const pageWidth = doc.page.width - 100;
      const maxHeight = 400;
      
      // Use fit to constrain the image within the bounds while maintaining aspect ratio
      doc.image(imageBuffer, {
        fit: [pageWidth, maxHeight],
        align: 'center',
      });
    } catch (error) {
      console.error('Failed to embed map image in PDF:', error);
      doc.fontSize(10).font('Helvetica-Oblique').fillColor('gray').text('地図画像の埋め込みに失敗しました', { align: 'center' });
    }
  }

  private drawFooter(doc: PDFKit.PDFDocument): void {
    const pageHeight = doc.page.height;
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).font('Helvetica').fillColor('gray').text(
      '※ この書類は走行距離の参考情報です。正式な支給額は社内規定に基づき決定されます。',
      { align: 'center' }
    );
    doc.fillColor('black');
  }
}

export const pdfService = new PDFService();