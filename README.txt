# MoodTunez - Music Recommendation App

## File Structure

- `src/App.jsx` - Main application component handling navigation and state management
- `src/MusicRecommendation.jsx` - Component for fetching and displaying music recommendations
- `src/PlaylistRecommendation.jsx` - Component for displaying track lists and handling playback
- `src/EmotionInput.jsx` - Component for selecting user's emotional state
- `src/GenreSelection.jsx` - Component for selecting music genre preferences
- `src/soundcloudClient.js` - Client for fetching music from Deezer API with fallback mechanisms
- `src/supabaseClient.js` - Client for Supabase authentication and database interactions
- `src/LoadingScreen.jsx` - Loading animation component
- `src/Auth/Login.jsx` - Login form component
- `src/Auth/Register.jsx` - Registration form component
- `src/main.jsx` - Application entry point
- `src/App.css` - Main stylesheet
- `index.html` - HTML entry point
- `package.json` - Project dependencies and scripts
- `vite.config.js` - Vite configuration file

## How to Run the Software

### Development Environment Setup

1. Install Node.js (version 16.0.0 or higher) from https://nodejs.org/
2. Install Git from https://git-scm.com/

### Building from Source

1. Clone the repository or extract the ZIP file to your desired location
2. Open a terminal/command prompt and navigate to the project directory:
   ```
   cd path/to/moodtunez-main
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open your browser and navigate to the local URL shown in the terminal (usually http://localhost:5173/)

### Production Build

To create a production-ready build:
1. Run the build command:
   ```
   npm run build
   ```
2. The compiled files will be in the `dist` directory

### Running the Production Build

1. Install a static file server if you don't have one:
   ```
   npm install -g serve
   ```
2. Run the server pointing to the dist directory:
   ```
   serve -s dist
   ```
3. Open your browser and navigate to the URL shown (usually http://localhost:3000)

### Authentication

The application uses Supabase for authentication. You can:
- Create a new account via the Register option
- Log in with existing credentials
- Use the app without logging in, but playlist saving will be unavailable

Example test account:
- Email: test@example.com
- Password: password123

### Application Parameters and Usage

The MoodTunez application allows users to:

1. **Select Emotion**: Choose from HAPPY, SAD, STRESSED, or MOTIVATED
2. **Select Genre**: Choose from hip-hop, rock, country, edm, or pop
3. **Interact with Playlists**:
   - Play/pause tracks
   - Like/unlike tracks
   - Create a playlist of liked tracks
   - Export playlist to Spotify via TuneMyMusic

#### Controls and Features

- **Back Button**: Returns to the previous screen from any point in the application
- **Regenerate Button**: Creates a new randomized playlist within the selected emotion/genre
- **TuneMyMusic**: Exports liked tracks as a CSV file that can be imported into Spotify

#### Troubleshooting

If the application shows a white screen or doesn't load:
1. Check your internet connection
2. Try clearing your browser cache
3. Ensure you're using a modern browser (Chrome, Firefox, Edge)
4. Check terminal for any error messages

If multiple instances of the app are running and using different ports:
1. Close all instances with Ctrl+C
2. Kill all Node.js processes:
   ```
   taskkill /F /IM node.exe  # On Windows
   pkill -f node  # On Mac/Linux
   ```
3. Restart with `npm run dev` 