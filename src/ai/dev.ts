import { config } from 'dotenv';
config();

import '@/ai/flows/generate-video-tags.ts';
import '@/ai/flows/refine-video-tags-with-user-feedback.ts';