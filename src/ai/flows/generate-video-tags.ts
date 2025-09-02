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
  prompt: `You are an expert in real estate video analysis and tagging. Your task is to generate a descriptive filename for a video based on a single frame.

  The filename format is: YYYYMMDD_<PrimarySubject>_<KeyAttributes>_<ShotStyle?>_<TopTagCluster>_<shortHash>.mp4

  Analyze the provided frame and use the following catalog to determine the best tags. If you cannot find a perfect match, use your best judgment to create a descriptive and optimized filename.

  **CATALOG:**

  **Macro / Exterior Shots**
  - Drone aerial
  - Tower façade
  - Villa exterior
  - Plots / land
  - Golf course
  - Mountains backdrop
  - Expressway
  - Entrance gate
  - Clubhouse exterior
  - Rooftop terrace
  - Pool deck

  **Interior & Lifestyle**
  - Lobby
  - Gym
  - Spa
  - Kids play
  - Living room
  - Kitchen
  - Bedroom
  - Master suite
  - Bathroom
  - Balcony view
  - Show flat

  **Lighting & Atmosphere**
  - Golden hour
  - Blue hour
  - Daytime clear
  - Lush greenery
  - Water features
  - Glass façade
  - Low-density spacing

  **Camera Motions & Cinematic Moves**
  - Slow dolly
  - Gimbal walk
  - Orbit
  - Pull-back reveal
  - Parallax lateral
  - Crane up
  - FPV sweep

  **Connectivity & Infrastructure**
  - Metro connectivity (station exterior, metro trains arriving/leaving, skyline with metro line)
  - Road connectivity (expressway flyovers, arterial roads, smooth traffic shots)
  - Train connectivity (long-distance trains, modern stations, bridges)
  - Airport connectivity (aerial view of runway, aircraft taking off/landing, modern terminal)

  **INPUT:**
  Frame: {{media url=frameDataUri}}
  Original Filename: {{{filename}}}

  Respond only with the generated filename. Do not include any additional explanations or context.
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
