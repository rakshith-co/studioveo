'use server';

/**
 * @fileOverview Allows a video editor to refine automatically generated tags for a video.
 *
 * - refineVideoTags - A function that handles the tag refinement process.
 * - RefineVideoTagsInput - The input type for the refineVideoTags function.
 * - RefineVideoTagsOutput - The return type for the refineVideoTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineVideoTagsInputSchema = z.object({
  originalTags: z
    .string()
    .describe('The original automatically generated tags for the video.'),
  userFeedback: z
    .string()
    .describe('The video editor feedback on the original tags.'),
});
export type RefineVideoTagsInput = z.infer<typeof RefineVideoTagsInputSchema>;

const RefineVideoTagsOutputSchema = z.object({
  refinedTags: z
    .string()
    .describe('The refined tags for the video incorporating user feedback.'),
});
export type RefineVideoTagsOutput = z.infer<typeof RefineVideoTagsOutputSchema>;

export async function refineVideoTags(input: RefineVideoTagsInput): Promise<RefineVideoTagsOutput> {
  return refineVideoTagsFlow(input);
}

const refineVideoTagsPrompt = ai.definePrompt({
  name: 'refineVideoTagsPrompt',
  input: {schema: RefineVideoTagsInputSchema},
  output: {schema: RefineVideoTagsOutputSchema},
  prompt: `You are an expert video tag refiner.

You are given the original tags for a video and feedback from a video editor.
Your goal is to refine the tags based on the feedback to improve search accuracy.

Original Tags: {{{originalTags}}}
User Feedback: {{{userFeedback}}}

Refined Tags:`, // The prompt should guide the LLM to generate refined tags.
});

const refineVideoTagsFlow = ai.defineFlow(
  {
    name: 'refineVideoTagsFlow',
    inputSchema: RefineVideoTagsInputSchema,
    outputSchema: RefineVideoTagsOutputSchema,
  },
  async input => {
    const {output} = await refineVideoTagsPrompt(input);
    return output!;
  }
);
