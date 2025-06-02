import React, { useState } from 'react';
import { supabase, skipProfileCreation, shouldSkipProfileCreation } from '../supabaseClient';
import { FaMusic, FaSpinner } from 'react-icons/fa';
import '../App.css';

function Register({ toggleView, onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const validateForm = () => {
        // Valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Please enter a valid email address");
            return false;
        }

        // Password must be at least 6 characters
        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return false;
        }

        // Passwords must match
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return false;
        }

        return true;
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("Attempting to register with:", { email });
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) {
                console.error("Registration error from Supabase:", error);
                throw error;
            }
            
            console.log("Registration response:", data);
            
            // Check if email confirmation is required
            if (data?.user?.identities?.length === 0) {
                setError("This email is already registered. Please try logging in instead.");
            } else if (data?.user && !data?.session) {
                setSuccessMessage("Registration successful! Please check your email to confirm your account.");
                // After successful registration, wait a moment then redirect to login
                setTimeout(() => {
                    if (onSuccess) {
                        console.log("Registration successful, redirecting");
                        onSuccess();
                    }
                }, 3000);
            } else {
                setSuccessMessage("Registration successful!");
                // Auto-redirect to login or main app
                setTimeout(() => {
                    if (onSuccess) {
                        console.log("Registration successful, redirecting");
                        onSuccess();
                    }
                }, 2000);
            }
        } catch (error) {
            console.error("Registration error details:", error);
            
            // User-friendly error messages
            if (error.message.includes("User already registered")) {
                setError("This email is already registered. Please try logging in instead.");
            } else {
                setError(error.message || "Failed to register. Please try again with a different email.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="page-title">
                MOOD TU<span className="music-letter"><FaMusic /></span>EZ
            </div>
            
            <div className="auth-card">
                <h2>Create Account</h2>
                
                {error && <div className="auth-error">{error}</div>}
                {successMessage && <div className="auth-success">{successMessage}</div>}
                
                <form onSubmit={handleRegister} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="your@email.com"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="At least 6 characters"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            placeholder="Re-enter password"
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="loading-spinner">
                                <FaSpinner className="spinner-icon" /> Creating account...
                            </span>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>
                
                <div className="auth-footer">
                    Already have an account?{' '}
                    <button onClick={toggleView} className="auth-link" disabled={loading}>
                        Sign In
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Register; 