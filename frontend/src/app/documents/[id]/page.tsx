"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Editor } from '@tinymce/tinymce-react';
import { Editor as TinyMCEEditor } from 'tinymce';
import Link from 'next/link';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  isPublic: boolean;
  publicEdit: boolean;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

type UserDocumentRole = 'OWNER' | 'EDITOR' | 'VIEWER' | 'PUBLIC_VIEWER' | 'PUBLIC_EDITOR' | 'NONE';

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const { isAuthenticated, loading: authLoading, logout, userId: authenticatedUserId } = useAuth();
  const router = useRouter();

  const [document, setDocument] = useState<Document | null>(null);
  const [userRole, setUserRole] = useState<UserDocumentRole>('NONE');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');

  const [pageError, setPageError] = useState<string | null>(null);
  const [pageLoading, setLoadingPage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const editorRef = useRef<TinyMCEEditor | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!document && id) {
      const fetchDocument = async () => {
        setLoadingPage(true);
        setPageError(null);
        try {
          const res = await fetch(`/api/documents/${id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          const responseData = await res.json();

          if (!res.ok) {
            if (res.status === 401) {
              logout();
              router.push('/login');
              return;
            }
            else if (res.status === 403 || res.status === 404) {
                setPageError(responseData.error || 'Document not found or access denied.');
                setLoadingPage(false);
                return;
            }
            throw new Error(responseData.error || 'Failed to load document.');
          }

          setDocument(responseData.document);
          setUserRole(responseData.userRole);
          setEditTitle(responseData.document.title);

        } catch (err: unknown) {
          console.error('Error fetching document:', err);
          setPageError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
          setLoadingPage(false);
        }
      };
      fetchDocument();
    }
  }, [id, isAuthenticated, authLoading, router, logout, document]);

  const canEdit = ['OWNER', 'EDITOR', 'PUBLIC_EDITOR'].includes(userRole);
  const canView = ['OWNER', 'EDITOR', 'VIEWER', 'PUBLIC_VIEWER', 'PUBLIC_EDITOR'].includes(userRole);
  const canManagePermissions = userRole === 'OWNER' && authenticatedUserId === document?.userId;
  const canDelete = userRole === 'OWNER';

  const handleSave = async () => {
    setIsSaving(true);
    setPageError(null);

    if (!canEdit) {
        setPageError("You do not have permission to edit this document.");
        setIsSaving(false);
        return;
    }

    const editorContent = editorRef.current ? editorRef.current.getContent() : '';

    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ title: editTitle, content: editorContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          logout();
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to save document.');
      }

      setDocument(data);
      setIsEditing(false);
    } catch (err: unknown) {
      console.error('Error saving document:', err);
      setPageError(err instanceof Error ? err.message : 'An unknown error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
        setPageError("You do not have permission to delete this document.");
        return;
    }

    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    setIsDeleting(true);
    setPageError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401 || res.status === 403) {
          logout();
          router.push('/login');
          return;
        }
        throw new Error(data.error || 'Failed to delete document.');
      }

      router.push('/');
    } catch (err: unknown) {
      console.error('Error deleting document:', err);
      setPageError(err instanceof Error ? err.message : 'An unknown error occurred while deleting.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md">
          Loading document...
        </p>
      </div>
    );
  }

  if (pageError) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
            <p className="text-xl text-red-700 p-6 bg-white rounded-lg shadow-md mb-4">
                {pageError}
            </p>
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Back to Document List
            </Link>
        </div>
    );
  }

  if (!document || !canView) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md mb-4">
          Document not found or you do not have access.
        </p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Back to Document List
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-8">
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-4xl font-extrabold text-blue-700">Document Details</h1>
        <div className="flex space-x-4">
            {canManagePermissions && (
                <Link
                    href={`/documents/${id}/manage-permissions`}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-lg font-semibold hover:bg-purple-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                    Manage Permissions
                </Link>
            )}
            <Link
                href="/"
                className="px-6 py-2 bg-gray-600 text-white rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
                Back to Documents
            </Link>
        </div>
      </header>

      <main className="container mx-auto bg-white p-8 rounded-lg shadow-md">
        {isEditing && canEdit ? (
          <>
            <div className="mb-6">
              <label htmlFor="editTitle" className="block text-gray-700 text-lg font-semibold mb-2">Title:</label>
              <input
                id="editTitle"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="editContent" className="block text-lg font-medium text-gray-700 mb-2">Content:</label>
              <Editor
                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY}
                onInit={(_evt, editor) => editorRef.current = editor}
                initialValue={document.content || ''}
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
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 bg-green-600 text-white rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                    if (editorRef.current && document) {
                        editorRef.current.setContent(document.content || '');
                    }
                    setEditTitle(document?.title || '');
                    setIsEditing(false);
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg text-lg font-semibold hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-blue-700 mb-4">{document.title || 'Untitled Document'}</h2>
            {document.userId !== authenticatedUserId && document.user && (
                <p className="text-gray-600 text-lg mb-2">
                    Owned by: <span className="font-semibold">{document.user.username || document.user.email}</span>
                </p>
            )}
            <div
                className="prose max-w-none text-gray-700 text-lg mb-6"
                dangerouslySetInnerHTML={{ __html: document.content || 'This document has no content.' }}
            />
            <p className="text-gray-500 text-sm mb-6">
              Created On: {new Date(document.createdAt).toLocaleDateString()} | Last Updated: {new Date(document.updatedAt).toLocaleDateString()}
            </p>
            <div className="flex space-x-4">
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Edit Document
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg text-lg font-semibold hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Document'}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}