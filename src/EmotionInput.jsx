import React from "react";
import { FaMusic, FaRunning, FaSadTear, FaSmile, FaTired } from "react-icons/fa";
import "./App.css";

const moodOptions = [
    { label: "SAD", icon: <FaSadTear className="mood-icon" /> },
    { label: "HAPPY", icon: <FaSmile className="mood-icon" /> },
    { label: "NOSTALGIC", icon: <FaTired className="mood-icon" /> },
    { label: "PUMPED UP", icon: <FaRunning className="mood-icon" /> },
];

function EmotionInput({ onEmotionSubmit }) {
    return (
        <div className="page-container">
            <div className="page-title">
                MOOD TU<span className="music-letter"><FaMusic /></span>EZ
            </div>

            <div className="mood-card">
                <div className="music-icon-container">
                    <FaMusic className="music-note-icon" />
                </div>
                <div className="mood-title">How are you feeling?</div>

                {moodOptions.map((mood) => (
                    <button
                        key={mood.label}
                        onClick={() => onEmotionSubmit(mood.label)}
                        className="mood-button"
                        data-mood={mood.label}
                    >
                        <span className="icon-wrapper">{mood.icon}</span>
                        <span>{mood.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default EmotionInput;