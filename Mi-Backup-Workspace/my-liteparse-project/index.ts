import { LiteParse } from '@llamaindex/liteparse';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const parser = new LiteParse({ 
    ocrEnabled: true,
    ocrLanguage: 'spa',
    numWorkers: 2,
    dpi: 300,
    outputFormat: 'json',
    preserveVerySmallText: true,
    preserveLayoutAlignmentAcrossPages: true,
    preciseBoundingBox: true
  });
  
  const inputDir = path.join(process.cwd(), 'data', 'input_pdfs');
  const outputDir = path.join(process.cwd(), 'data', 'output_json');
  
  const files = fs.readdirSync(inputDir);
  
  for (const file of files) {
    if (file.toLowerCase().endsWith('.pdf')) {
      const inputPath = path.join(inputDir, file);
      const parsedFilename = file.replace(/\.pdf$/i, '.json');
      const outputPath = path.join(outputDir, parsedFilename);
      
      console.log(`Parsing ${file}...`);
      try {
        const result = await parser.parse(inputPath);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`Successfully parsed ${file}. Result saved to ${parsedFilename}`);
      } catch (error) {
        console.error(`Failed to parse ${file}: ${error}`);
      }
    }
  }
}

main().catch(console.error);
