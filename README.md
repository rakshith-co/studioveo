
# Revspot Vision

Revspot Vision is an AI-powered application designed to automatically analyze and tag real estate videos. It extracts a representative frame from each video, uses AI to generate a descriptive and searchable filename, and allows you to sync your video library directly from Google Drive.

## Features

- **AI-Powered Tagging**: Automatically generates descriptive filenames based on video content.
- **Google Picker Integration**: Select videos directly from your Google Drive or upload new ones.
- **Tag Refinement**: Manually refine the AI-generated tags to improve accuracy.
- **Video Playback**: Instantly preview your videos within the app.
- **Save to Drive**: Rename files in Google Drive with the new AI-generated tags with a single click.

---

## Project Setup

To run this project, you will need API credentials from Google Cloud and Google AI Studio.

### Step 1: Get Google Drive API Credentials

1.  **Create a Google Cloud Project**: Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2.  **Enable the Google Drive API**:
    - In your project dashboard, navigate to **APIs & Services > Library**.
    - Search for "Google Drive API" and click **Enable**.
3.  **Create OAuth 2.0 Credentials**:
    - Go to **APIs & Services > OAuth consent screen**.
    - Choose **External** and fill in the required app information (app name, user support email, developer contact). You don't need to submit for verification for testing.
    - Go to the **Credentials** tab. Click **+ CREATE CREDENTIALS** and select **OAuth client ID**.
    - Select **Web application** for the application type.
    - Under **Authorized redirect URIs**, click **+ ADD URI**. You will need to add URIs for both local development and your production deployment.
      - For local development, add: `http://localhost:9002/api/auth/google/callback`
    - Click **Create**. You will be shown your **Client ID** and **Client Secret**. Keep these safe.
4.  **Add Test Users (for Development)**:
    - On the **OAuth consent screen** page, find the **Test users** section.
    - Click **+ ADD USERS** and add the Google account(s) you will use to test the application locally. **The app will not work without this step while in "testing" mode.**
5.  **Get your Project Number**:
    - Go to your Google Cloud Console dashboard.
    - Your project number will be visible on the "Project info" card.

### Step 2: Get a Gemini API Key

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in and click on the **Get API key** option.
3.  Create a new API key in a project. Copy this key.

### Step 3: Configure Environment Variables

Create a file named `.env` in the root of the project and add your credentials:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GOOGLE_PROJECT_NUMBER=YOUR_GOOGLE_PROJECT_NUMBER
GOOGLE_REDIRECT_URI=http://localhost:9002/api/auth/google/callback
```

### Step 4: Install Dependencies and Run Locally

1.  Install the project dependencies:
    ```bash
    npm install
    ```
2.  Run the development server:
    ```bash
    npm run dev
    ```
3.  Open [http://localhost:9002](http://localhost:9002) in your browser.

---

## Deployment on Vercel

1.  **Push to a Git Provider**: Push your project code to GitHub, GitLab, or Bitbucket.
2.  **Import Project on Vercel**:
    - Go to your Vercel dashboard and click **Add New... > Project**.
    - Import the Git repository you just created.
3.  **Configure Environment Variables**:
    - In your Vercel project settings, go to **Settings > Environment Variables**.
    - Add the same five keys from your `.env` file: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_PROJECT_NUMBER`, and `GOOGLE_REDIRECT_URI`.
    - **Important**: For the `GOOGLE_REDIRECT_URI` on Vercel, use your production URL (e.g., `https://your-app-name.vercel.app/api/auth/google/callback`).
4.  **Update Google Credentials for Production**:
    - Go back to your Google Cloud project **Credentials** page and edit your OAuth 2.0 Client ID.
    - Under **Authorized redirect URIs**, click **+ ADD URI** and add your production callback URL: `https://your-app-name.vercel.app/api/auth/google/callback`
    - Click **Save**.
5.  **Deploy**: Vercel will automatically trigger a new deployment when you add environment variables. Wait for it to complete.

---

## How to Use the Application

1.  **Connect to Google Drive**:
    - Click the **Connect Drive** button in the header. This will open a Google authentication window.
    - Sign in with a Google account that you added as a "Test User".
    - After authorizing, you will be redirected back to the app, which will now show "Drive Connected".
2.  **Add Videos**:
    - Click the **Pick from Drive** button.
    - A Google Picker will open. You can either select an existing video from your Drive or upload a new one. A folder named `RevspotVision-Uploads` will be created in your Drive for new uploads.
3.  **Processing and Tagging**:
    - The app will automatically process each new video. A thumbnail will be generated, and the AI will create a new filename (tag).
4.  **Managing Videos**:
    - **Play**: Click the play icon on a video card to watch it in a modal.
    - **Refine Tags**: Click the pencil icon to provide feedback and refine the AI-generated tags (future feature).
    - **Save to Drive**: If the video came from Google Drive, a save icon will appear. Clicking it will rename the file in your Google Drive with the new tags.
    - **Copy Filename**: If you uploaded the video directly, a copy icon will appear. Clicking it copies the new filename to your clipboard so you can rename the file manually.

    