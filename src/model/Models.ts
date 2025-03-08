export interface PdfPage {
  pageNum: number;
  pageContent: string;
}

export interface EmailWithLocation {
  email: string;
  location: string;
}

export interface PageAnalyseResult {
  page: PdfPage;
  emails: EmailWithLocation[];
}