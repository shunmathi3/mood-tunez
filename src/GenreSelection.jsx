import React from 'react';
import { FaArrowLeft, FaGuitar, FaMusic, FaRegSmile, FaDrum, FaCompactDisc } from 'react-icons/fa';
import { GiCowboyBoot } from 'react-icons/gi';
import './App.css';

const genres = [
    { id: "hip-hop", label: "Hip Hop", icon: <FaMusic className="mood-icon" /> },
    { id: "rock", label: "Rock", icon: <FaGuitar className="mood-icon" /> },
    { id: "country", label: "Country", icon: <GiCowboyBoot className="mood-icon" /> },
    { id: "edm", label: "EDM", icon: <FaDrum className="mood-icon" /> },
    { id: "pop", label: "Pop", icon: <FaCompactDisc className="mood-icon" /> }
];

function GenreSelection({ emotion, onGenreSubmit, onBackClick }) {
    console.log(`GenreSelection component rendered with emotion: ${emotion}`);
    
    const handleGenreClick = (genreId) => {
        console.log(`Genre selected: ${genreId} for emotion: ${emotion}`);
        // Ensure genre id is consistently lowercase and trimmed
        const normalizedGenreId = genreId.toLowerCase().trim();
        console.log(`Normalized genre ID: ${normalizedGenreId}`);
        onGenreSubmit(normalizedGenreId);
    };
    
    return (
        <div className="page-container with-nav">
            <button onClick={onBackClick} className="back-button">
                <FaArrowLeft /> Back
            </button>
            
            <div className="page-title">
                MOOD TU<span className="music-letter"><FaMusic /></span>EZ
            </div>

            <div className="mood-card">
                <div className="music-icon-container">
                    <FaRegSmile className="music-note-icon" />
                </div>
                <div className="mood-title">Select a genre for your {emotion.toLowerCase()} mood</div>

                {genres.map((genre) => (
                    <button
                        key={genre.id}
                        onClick={() => handleGenreClick(genre.id)}
                        className="mood-button"
                        data-mood={emotion}
                        data-genre={genre.id}
                    >
                        <span className="icon-wrapper">{genre.icon}</span>
                        <span>{genre.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default GenreSelection; 