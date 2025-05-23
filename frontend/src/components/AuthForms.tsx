"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const RegisterForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Registration successful! ${data.message}`);
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setMessage(`Registration error: ${data.error || data.message}`);
      }
    } catch (error) {
      console.error('Network/server error during registration:', error);
      setMessage('Error communicating with the server.');
    }
  };

  return (
    <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md text-center text-gray-800">
      <h2 className="text-4xl text-blue-700 font-bold mb-8">Register</h2>
      <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <button
          type="submit"
          className="p-3 bg-blue-600 text-white rounded-md text-xl font-bold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Register
        </button>
      </form>
      {message && (
        <p className={`mt-6 p-3 rounded-md text-base font-semibold ${
          message.includes('successful')
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message}
        </p>
      )}
      <Link href="/login" className="mt-6 inline-block text-blue-600 hover:underline text-lg">
        Already have an account? Login here.
      </Link>
    </div>
  );
};

export const LoginForm: React.FC = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (loading) return;

    const success = await login(username, password);
    if (success) {
      setMessage('Login successful! Redirecting...');
      router.push('/');
    } else {
      setMessage('Login error: Invalid credentials or internal server error.');
    }
  };

  return (
    <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-md text-center text-gray-800">
      <h2 className="text-4xl text-blue-700 font-bold mb-8">Login</h2>
      
      {loading ? (
        <p className="text-gray-600 text-lg">Loading authentication status...</p>
      ) : isAuthenticated ? (
        <div className="text-green-700 text-2xl font-semibold">
          <p>You are already authenticated!</p>
          <p>Redirecting to dashboard or another page.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-md text-xl font-bold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Log In
          </button>
        </form>
      )}

      {message && (
        <p className={`mt-6 p-3 rounded-md text-base font-semibold ${
          message.includes('successful')
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message}
        </p>
      )}

      {!isAuthenticated && !loading && (
          <Link href="/register" className="mt-6 inline-block text-blue-600 hover:underline text-lg">
            Dont have an account? Register here.
          </Link>
      )}
    </div>
  );
};