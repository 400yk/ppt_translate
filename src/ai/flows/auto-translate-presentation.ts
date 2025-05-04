// This is a server-side file.
'use server';
/**
 * @fileOverview This file defines a Genkit flow for automatically translating editable text elements within a PPT/PPTX file.
 *
 * It includes:
 * - `autoTranslatePresentation`: The main function to trigger the translation flow.
 * - `AutoTranslatePresentationInput`: The input type for the `autoTranslatePresentation` function, defining the PPT/PPTX file and target language.
 * - `AutoTranslatePresentationOutput`: The output type for the `autoTranslatePresentation` function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import pptxgen from 'pptxgenjs';

const AutoTranslatePresentationInputSchema = z.object({
  fileUrl: z.string().describe('The URL of the PPT/PPTX file to translate.'),
  targetLanguage: z.enum(['en', 'zh']).describe('The target language for translation (en: English, zh: Chinese).'),
});
export type AutoTranslatePresentationInput = z.infer<typeof AutoTranslatePresentationInputSchema>;

const AutoTranslatePresentationOutputSchema = z.object({
  translatedFileUrl: z.string().describe('The URL of the translated PPT/PPTX file.'),
  translationReport: z.string().describe('A summary of the translation process, including the number of elements translated.'),
});
export type AutoTranslatePresentationOutput = z.infer<typeof AutoTranslatePresentationOutputSchema>;

export async function autoTranslatePresentation(input: AutoTranslatePresentationInput): Promise<AutoTranslatePresentationOutput> {
  return autoTranslatePresentationFlow(input);
}

const shouldTranslateText = ai.defineTool({
  name: 'shouldTranslateText',
  description: 'Determines if a given text element from a presentation should be translated based on its context.',
  inputSchema: z.object({
    text: z.string().describe('The text element to evaluate.'),
    elementContext: z.string().describe('The context of the text element within the presentation (e.g., slide title, bullet point, image caption).'),
  }),
  outputSchema: z.boolean().describe('A boolean value indicating whether the text should be translated (true) or not (false).'),
},
async input => {
  // Add your logic here to determine if the text should be translated.
  // This could involve checking for specific keywords, formatting, or other contextual cues.
  // For now, we will always return true
  return true;
});

const translateText = ai.defineTool({
  name: 'translateText',
  description: 'Translates a given text from Chinese to English or vice versa.',
  inputSchema: z.object({
    text: z.string().describe('The text to translate.'),
    targetLanguage: z.enum(['en', 'zh']).describe('The target language for translation (en: English, zh: Chinese).'),
  }),
  outputSchema: z.string().describe('The translated text.'),
},
async input => {
    // Call a translation service here.
    // For now, just return a placeholder.
    return `Translated to ${input.targetLanguage}: ${input.text}`;
  }
);

const autoTranslatePresentationPrompt = ai.definePrompt({
  name: 'autoTranslatePresentationPrompt',
  input: {
    schema: z.object({
      fileUrl: z.string().describe('The URL of the PPT/PPTX file to translate.'),
      targetLanguage: z.enum(['en', 'zh']).describe('The target language for translation (en: English, zh: Chinese).'),
    }),
  },
  output: {
    schema: z.object({
      translatedFileUrl: z.string().describe('The URL of the translated PPT/PPTX file.'),
      translationReport: z.string().describe('A summary of the translation process, including the number of elements translated.'),
    }),
  },
  prompt: `You are an AI expert in charge of translating powerpoint presentations, you will be given the URL of the file, and the target language. You are expected to translate the file into the target language, and return the URL of the translated file and also provide a translation report.

Translate all the editable texts in the powerpoint presentation from Chinese to English or vise versa, based on the target language specified. Use the provided tool \"translateText\" to translate text and \"shouldTranslateText\" to decide if certain text should be translated based on context.

Presentation File URL: {{{fileUrl}}}
Target Language: {{{targetLanguage}}}
`,
  tools: [translateText, shouldTranslateText],
});

const autoTranslatePresentationFlow = ai.defineFlow<
  typeof AutoTranslatePresentationInputSchema,
  typeof AutoTranslatePresentationOutputSchema
>(
  {
    name: 'autoTranslatePresentationFlow',
    inputSchema: AutoTranslatePresentationInputSchema,
    outputSchema: AutoTranslatePresentationOutputSchema,
  },
  async input => {
    // 1. Download the PPT/PPTX file from the URL.
    const fileBuffer = await downloadFile(input.fileUrl);

    // 2. Parse the PPT/PPTX file and extract editable text elements.
    const presentationData = await parsePptx(fileBuffer);

    // 3. Translate the text elements.
    const translatedPresentationData = await translatePresentationData(presentationData, input.targetLanguage);

    // 4. Reconstruct the PPT/PPTX file with the translated text elements.
    const translatedFileBuffer = await createPptx(translatedPresentationData);

    // 5. Store the translated file in a storage service and get the URL.
    const translatedFileUrl = await uploadFile(translatedFileBuffer, 'translated-presentation.pptx');

    // 6. Generate a translation report.
    const translationReport = `Translated ${presentationData.slides.length} slides.`;

    return {
      translatedFileUrl,
      translationReport,
    };
  }
);

async function downloadFile(fileUrl: string): Promise<Buffer> {
  // download the file from the URL and return a Buffer
  // Use `fetch` or a library like `axios` to download the file
  // Example:
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer;
}

async function parsePptx(fileBuffer: Buffer): Promise<any> {
  //  parse the PPT/PPTX file and extract editable text elements
  // Use a library like `mammoth` or `pptxgenjs` to parse the file.
  // For simplicity, we will return a placeholder.
  return {
    slides: [
      {
        title: 'Slide 1 Title',
        body: 'Slide 1 body text',
      },
      {
        title: 'Slide 2 Title',
        body: 'Slide 2 body text',
      },
    ],
  };
}

async function translatePresentationData(presentationData: any, targetLanguage: 'en' | 'zh'): Promise<any> {
  // translate the text elements using the translateText tool
  // For each text element in the presentation data, call the `translateText` tool.
  const translatedSlides = [];
  for (const slide of presentationData.slides) {
    const translatedTitle = (await translateText({ text: slide.title, targetLanguage })).value;
    const translatedBody = (await translateText({ text: slide.body, targetLanguage })).value;
    translatedSlides.push({
      title: translatedTitle,
      body: translatedBody,
    });
  }
  return {slides: translatedSlides};
}

async function createPptx(translatedPresentationData: any): Promise<Buffer> {
  // Reconstruct the PPT/PPTX file with the translated text elements
  try {
    // Create a new PowerPoint presentation
    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.author = 'LinguaSlides';
    pptx.company = 'LinguaSlides';
    pptx.revision = '1';
    pptx.subject = 'Translated Presentation';
    pptx.title = 'Translated Presentation';
    
    // Add translated slides
    translatedPresentationData.slides.forEach((slideData: any) => {
      // Create a new slide
      const slide = pptx.addSlide();
      
      // Add title
      if (slideData.title) {
        slide.addText(slideData.title, { 
          x: 0.5, 
          y: 0.5, 
          w: '90%', 
          h: 1.0, 
          fontSize: 24,
          bold: true,
          color: '363636'
        });
      }
      
      // Add body text
      if (slideData.body) {
        slide.addText(slideData.body, { 
          x: 0.5, 
          y: 1.8, 
          w: '90%', 
          h: 4.0, 
          fontSize: 18,
          color: '363636',
          breakLine: true
        });
      }
    });
    
    // Generate a Buffer using the standard method from pptxgenjs
    // Not using outputType here since it's handled internally by the 'buffer' parameter
    const buffer = await pptx.write('buffer') as any;
    return Buffer.from(buffer);
  } catch (error) {
    console.error('Error creating PPTX file:', error);
    throw new Error('Failed to create translated PowerPoint file');
  }
}

async function uploadFile(fileBuffer: Buffer, fileName: string): Promise<string> {
  // store the translated file in a storage service and return the URL
  // Use Firebase Storage, AWS S3, or any other storage service to store the file.
  // For simplicity, we will return a placeholder.
  return '/dummy-translated-presentation.pptx';
}

export { parsePptx, translatePresentationData, createPptx };
