"use client";

import { RegisterForm } from '@/components/AuthForms';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-gray-800">
      {loading ? (
        <p className="text-xl text-gray-700 p-6 bg-white rounded-lg shadow-md">
          Loading authentication status...
        </p>
      ) : isAuthenticated ? (
        <div className="text-center text-green-700 text-2xl font-semibold p-8 bg-white rounded-lg shadow-md">
          <p>You are already authenticated!</p>
          <p className="mt-2">You can go to the home page or dashboard.</p>
          <Link href="/" className="mt-6 inline-block text-blue-600 hover:underline text-lg">
            Go to Home Page
          </Link>
        </div>
      ) : (
        <RegisterForm />
      )}
    </div>
  );
}