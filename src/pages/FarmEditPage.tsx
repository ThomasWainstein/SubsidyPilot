
import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import FarmEditForm from '@/components/farm/FarmEditForm';

const FarmEditPage = () => {
  const { farmId } = useParams<{ farmId: string }>();

  if (!farmId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Farm Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Invalid farm ID provided.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="flex-grow">
        <FarmEditForm farmId={farmId} />
      </main>
    </div>
  );
};

export default FarmEditPage;
