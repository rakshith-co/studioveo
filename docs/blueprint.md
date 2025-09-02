# **App Name**: VeoVision Indexer

## Core Features:

- Frame Extraction: Extract a representative frame (at 1/3 of the duration) from each video using OpenCV for LLM vision context.
- Video Context Analysis: Use the Gemini Pro Vision API tool to analyze the extracted frame and determine the key elements and context of the real estate video.
- Automatic Tagging: Generate descriptive tags for each video based on the analysis results from Gemini Pro Vision, informed by a real estate video catalog. The tags will use this file stucture YYYYMMDD_<PrimarySubject>_<KeyAttributes>_<ShotStyle?>_<TopTagCluster>_<shortHash>.mp4 .
- Metadata Storage: Store the extracted frame (as a thumbnail) and the generated tags in the video file's metadata, as well as in a simple JSON file for easy access.
- Searchable Index: Create a simple user interface to search and filter videos based on the generated tags. Results are displayed as thumbnails.
- Video Preview: Allow users to play a selected video directly from the search results.
- Bulk Processing: Enable processing of multiple videos in a directory at once, streamlining the indexing process.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to evoke trust and professionalism.
- Background color: Light gray (#ECEFF1), providing a clean and unobtrusive backdrop.
- Accent color: Soft green (#8BC34A) to highlight key actions and tags.
- Body and headline font: 'Inter', a sans-serif for a modern and readable interface.
- Use simple, consistent icons from a library like Material Icons to represent different search filters and actions.
- A grid-based layout for video thumbnails, ensuring a clean and organized presentation of search results.
- Subtle animations, such as fading effects on hover, to enhance user interaction without being distracting.