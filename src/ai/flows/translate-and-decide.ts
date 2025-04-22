'use server';
/**
 * @fileOverview An AI agent that translates text from Chinese to English or vice versa in a PPT/PPTX file, deciding whether to translate based on context.
 *
 * - intelligentTranslationDecision - A function that handles the translation process with context-based decisions.
 * - IntelligentTranslationDecisionInput - The input type for the intelligentTranslationDecision function.
 * - IntelligentTranslationDecisionOutput - The return type for the intelligentTranslationDecision function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const IntelligentTranslationDecisionInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  sourceLanguage: z.enum(['Chinese', 'English']).describe('The original language of the text.'),
  targetLanguage: z.enum(['Chinese', 'English']).describe('The desired language for the translation.'),
  context: z.string().describe('The context of the text within the presentation.'),
});
export type IntelligentTranslationDecisionInput = z.infer<typeof IntelligentTranslationDecisionInputSchema>;

const IntelligentTranslationDecisionOutputSchema = z.object({
  translatedText: z.string().describe('The translated text, if translation is needed, otherwise the original text.'),
  shouldTranslate: z.boolean().describe('Whether the text should be translated based on the context.'),
});
export type IntelligentTranslationDecisionOutput = z.infer<typeof IntelligentTranslationDecisionOutputSchema>;

export async function intelligentTranslationDecision(
  input: IntelligentTranslationDecisionInput
): Promise<IntelligentTranslationDecisionOutput> {
  return intelligentTranslationDecisionFlow(input);
}

const translationDecisionPrompt = ai.definePrompt({
  name: 'translationDecisionPrompt',
  input: {
    schema: z.object({
      text: z.string().describe('The text to be translated.'),
      sourceLanguage: z.enum(['Chinese', 'English']).describe('The original language of the text.'),
      targetLanguage: z.enum(['Chinese', 'English']).describe('The desired language for the translation.'),
      context: z.string().describe('The context of the text within the presentation.'),
    }),
  },
  output: {
    schema: z.object({
      translatedText: z.string().describe('The translated text, if translation is needed, otherwise the original text.'),
      shouldTranslate: z.boolean().describe('Whether the text should be translated based on the context.'),
    }),
  },
  prompt: `You are an AI assistant specializing in translating presentation slides. Your task is to translate the given text from {{sourceLanguage}} to {{targetLanguage}}. However, you must intelligently decide whether the translation is necessary based on the context.

Here are some guidelines:
1.  Do not translate company names, proper nouns, or specific industry jargon that should remain in the original language.
2.  Consider the context of the text within the presentation. If the text is crucial for understanding the slide's content, translate it. If it is supplementary or can be understood without translation, you may skip it.
3.  If the text is already in the target language, do not translate it.

Text: {{{text}}}
Source Language: {{sourceLanguage}}
Target Language: {{targetLanguage}}
Context: {{{context}}}

Based on the above, determine whether the text should be translated and provide the translated text if needed. Return the translated text as well as a boolean value called shouldTranslate.

If you decide not to translate, return the original text in the translatedText field, and set shouldTranslate to false.
`,
});

const intelligentTranslationDecisionFlow = ai.defineFlow<
  typeof IntelligentTranslationDecisionInputSchema,
  typeof IntelligentTranslationDecisionOutputSchema
>(
  {
    name: 'intelligentTranslationDecisionFlow',
    inputSchema: IntelligentTranslationDecisionInputSchema,
    outputSchema: IntelligentTranslationDecisionOutputSchema,
  },
  async input => {
    const {output} = await translationDecisionPrompt(input);
    return output!;
  }
);
