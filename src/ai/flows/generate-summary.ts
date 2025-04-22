'use server';

/**
 * @fileOverview Generates a brief summary of the translated presentation, highlighting the key topics and insights.
 *
 * - generateSummary - A function that generates the summary.
 * - GenerateSummaryInput - The input type for the generateSummary function.
 * - GenerateSummaryOutput - The return type for the generateSummary function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const GenerateSummaryInputSchema = z.object({
  translatedText: z.string().describe('The translated text of the presentation.'),
});
export type GenerateSummaryInput = z.infer<typeof GenerateSummaryInputSchema>;

const GenerateSummaryOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the translated presentation.'),
});
export type GenerateSummaryOutput = z.infer<typeof GenerateSummaryOutputSchema>;

export async function generateSummary(input: GenerateSummaryInput): Promise<GenerateSummaryOutput> {
  return generateSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSummaryPrompt',
  input: {
    schema: z.object({
      translatedText: z.string().describe('The translated text of the presentation.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A brief summary of the translated presentation, highlighting the key topics and insights.'),
    }),
  },
  prompt: `You are an expert summarizer. Please provide a brief summary of the following translated presentation text, highlighting the key topics and insights:\n\n{{{translatedText}}}`,
});

const generateSummaryFlow = ai.defineFlow<
  typeof GenerateSummaryInputSchema,
  typeof GenerateSummaryOutputSchema
>(
  {
    name: 'generateSummaryFlow',
    inputSchema: GenerateSummaryInputSchema,
    outputSchema: GenerateSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
