"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';

export default function CreateDocumentPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const editorRef = useRef<TinyMCEEditor | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSaving(true);

    if (!isAuthenticated) {
      setMessage('You must be logged in to create a document.');
      setIsSaving(false);
      return;
    }

    const editorContent = editorRef.current ? editorRef.current.getContent() : '';

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title, content: editorContent }), 
      });

      const data = await res.json();

      if (res.ok) {
        setMessage('Document created successfully! Redirecting...');
        setTitle('');
        if (editorRef.current) {
            editorRef.current.setContent(''); 
        }
        router.push('/');
      } else {
        setMessage(`Error creating document: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Network or server error:', error);
      setMessage('Error communicating with the server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-800">
        <p className="text-xl">Loading authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 text-gray-800">
        <p className="text-xl text-red-500">You must be logged in to access this page.</p>
        <Link href="/login" className="ml-2 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-gray-800">
      <div className="bg-white p-10 rounded-lg shadow-xl w-full max-w-4xl">
        <h2 className="text-4xl text-blue-700 font-bold mb-8 text-center">Create New Document</h2>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
          <div>
            <label htmlFor="title" className="block text-lg font-medium text-gray-700 mb-2">Document Title:</label>
            <input
              type="text"
              id="title"
              placeholder="Enter document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="p-3 border border-gray-300 rounded-md text-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-lg font-medium text-gray-700 mb-2">Document Content:</label>
            <Editor
              apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
              onInit={(_evt, editor) => editorRef.current = editor}
              initialValue=""
              init={{
                height: 500,
                menubar: false,
                plugins: [
                  'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
                  'searchreplace', 'visualblocks', 'code', 'fullscreen',
                  'insertdatetime', 'media', 'table', 'help', 'wordcount'
                ],
                toolbar: 'undo redo | formatselect | ' +
                         'bold italic backcolor | alignleft aligncenter ' +
                         'alignright alignjustify | bullist numlist outdent indent | ' +
                         'removeformat | help',
                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                skin: 'oxide',
                content_css: 'default'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !isAuthenticated}
            className="p-3 bg-blue-600 text-white rounded-md text-xl font-bold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving Document...' : 'Create Document'}
          </button>
        </form>

        {message && (
          <p className={`mt-6 p-3 rounded-md text-base font-semibold text-center ${
            message.includes('successfully')
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message}
          </p>
        )}

        <div className="mt-8 text-center">
            <Link href="/" className="text-blue-600 hover:underline text-lg">
                Go back to Home
            </Link>
        </div>
      </div>
    </div>
  );
}