"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function NewDocumentPage() {
  const { isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(`Document created successfully! ID: ${data.id}`);
        setTitle('');
        setContent('');
        router.push('/'); 
      } else {
        setMessage(`Error creating document: ${data.error || data.message}`);
        if (res.status === 401) {
            logout();
            router.push('/login');
        }
      }
    } catch (error) {
      console.error('Network/server error while creating document:', error);
      setMessage('Error communicating with the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md">
          Loading authentication status...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-4xl font-extrabold text-blue-700">Create New Document</h1>
        <button
          onClick={logout}
          className="px-6 py-2 bg-red-600 text-white rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout
        </button>
      </header>

      <main className="container mx-auto max-w-2xl bg-white p-8 rounded-lg shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <div>
            <label htmlFor="title" className="block text-lg font-semibold text-gray-700 mb-2">Document Title</label>
            <input
              type="text"
              id="title"
              placeholder="Ex: My Project Proposal"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <div>
            <label htmlFor="content" className="block text-lg font-semibold text-gray-700 mb-2">Document Content</label>
            <textarea
              id="content"
              placeholder="Start writing your document here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="w-full p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-y"
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-8 py-4 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? 'Creating...' : 'Save Document'}
          </button>
        </form>

        {message && (
          <div className={`mt-8 p-4 rounded-lg text-base font-semibold ${
            message.includes('successfully')
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message}
          </div>
        )}

        <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:underline text-lg">
                Back to My Documents
            </Link>
        </div>
      </main>
    </div>
  );
}