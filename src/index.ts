import { pdfToPages } from 'pdf-ts';
import type { EmailWithLocation, PageAnalyseResult, PdfPage } from './model/Models';
import { promises as fsPromises } from 'fs';
import path from 'path';
import * as fs from 'fs';

async function readPdf(filepath: string): Promise<PdfPage[]> {
  const pdf = await fsPromises.readFile(filepath);
  const pages = await pdfToPages(pdf);

  return pages.map((page, index) => {
    return {
      pageNum: index + 1,
      pageContent: page.text,
    };
  });
}

function processPage(page: PdfPage): Promise<PageAnalyseResult> {
  return new Promise(async (resolve, reject) => {
    const emails = page.pageContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const emailLines = emails.map(email => {
      const emailIndex = page.pageContent.indexOf(email);
      const nextLineStart = page.pageContent.indexOf('\n', emailIndex) + 1;
      const nextLineEnd = page.pageContent.indexOf('\n', nextLineStart);
      const nextLine = page.pageContent.substring(nextLineStart, nextLineEnd).trim();
      return { email: email.trim(), nextLine };
    });
    resolve({
      page,
      emails: emailLines.map(emailLine => {
        return { email: emailLine.email, location: emailLine.nextLine };
      }),
    });
  });
}


async function main() {
  const pdfPath = path.join(__dirname, 'files', 'book_of_abstracts.pdf');
  const pdfPages = await readPdf(pdfPath);

  const pageResults = await Promise.all(pdfPages.map(processPage));

  const foundEmails = pageResults.reduce((acc, result) => {
    return acc.concat(result.emails);
  }, [] as EmailWithLocation[]);
  console.log('Number of found emails:', foundEmails.length);


  /*
    Create CSV with columns: email, page_number
    Put there all found emails with corresponding page numbers
    Save file in output folder with name emails.csv
  */
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const csvHeader = 'page_number;email;info,';
  const csvContent = pageResults.filter(pageResult => pageResult.emails.length > 0).map(pageResult => {
    return pageResult.emails.map(emailWithLocation => {
      return `${pageResult.page.pageNum};${emailWithLocation.email};${emailWithLocation.location}`;
    }).join('\n');
  }).join('\n');
  const csvData = `${csvHeader}\n${csvContent}`;
  const csvPath = path.join(outputDir, 'emails.csv'); 
  await fs.promises.writeFile(csvPath, csvData);
  console.log('CSV file with emails saved to:', csvPath);


}

main().catch(console.error);
