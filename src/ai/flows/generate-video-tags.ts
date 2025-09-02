'use server';

/**
 * @fileOverview This flow generates descriptive tags for real estate videos by analyzing a representative frame using the Gemini Pro Vision API.
 *
 * - generateVideoTags - A function that handles the generation of video tags.
 * - GenerateVideoTagsInput - The input type for the generateVideoTags function.
 * - GenerateVideoTagsOutput - The return type for the generateVideoTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVideoTagsInputSchema = z.object({
  frameDataUri: z
    .string()
    .describe(
      "A representative frame from the video, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  filename: z.string().describe('The original filename of the video.'),
});
export type GenerateVideoTagsInput = z.infer<typeof GenerateVideoTagsInputSchema>;

const GenerateVideoTagsOutputSchema = z.object({
  tags: z.string().describe('The generated tags for the video.'),
});
export type GenerateVideoTagsOutput = z.infer<typeof GenerateVideoTagsOutputSchema>;

export async function generateVideoTags(input: GenerateVideoTagsInput): Promise<GenerateVideoTagsOutput> {
  return generateVideoTagsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateVideoTagsPrompt',
  input: {schema: GenerateVideoTagsInputSchema},
  output: {schema: GenerateVideoTagsOutputSchema},
  prompt: `You are an expert in real estate video analysis and tagging.

  Analyze the following video frame and generate descriptive tags for the video.
  The tags should be in the format YYYYMMDD_<PrimarySubject>_<KeyAttributes>_<ShotStyle?>_<TopTagCluster>_<shortHash>.mp4
  based on a real estate video catalog and what's visible in the frame.

  Frame: {{media url=frameDataUri}}
  Filename: {{{filename}}}

  Respond only with the generated tags. Do not include any additional explanations or context.
`,
});

const generateVideoTagsFlow = ai.defineFlow(
  {
    name: 'generateVideoTagsFlow',
    inputSchema: GenerateVideoTagsInputSchema,
    outputSchema: GenerateVideoTagsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return {tags: output!.tags};
  }
);
