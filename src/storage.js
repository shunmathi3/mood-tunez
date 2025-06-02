// src/utils/storage.js
export const saveLikedSongs = (songs) => {
    try {
        localStorage.setItem('likedSongs', JSON.stringify(songs));
    } catch (error) {
        console.error("Failed to save songs:", error);
    }
};

export const getLikedSongs = () => {
    try {
        return JSON.parse(localStorage.getItem('likedSongs')) || [];
    } catch (error) {
        console.error("Failed to load songs:", error);
        return [];
    }
};

// Optional: Emotion-specific getter
export const getLikedSongsByEmotion = (emotion) => {
    const songs = getLikedSongs();
    return songs.filter(song => song.emotion === emotion);
};