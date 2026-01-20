import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { getPresignedUrl, uploadPdfToS3 } from '../../api/client';

type UploadState = 'idle' | 'getting-url' | 'uploading' | 'processing' | 'complete' | 'error';

export default function AdminUpload() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  const handleUpload = async () => {
    if (!file) return;

    try {
      setError(null);
      setState('getting-url');

      // Get presigned URL
      const { uploadUrl, jobId: newJobId } = await getPresignedUrl(file.name);
      setJobId(newJobId);

      setState('uploading');
      setProgress(0);

      // Upload to S3
      await uploadPdfToS3(uploadUrl, file, (percent) => {
        setProgress(percent);
      });

      setState('processing');

      // Wait a moment then redirect to job page
      setTimeout(() => {
        setState('complete');
        navigate(`/admin/jobs/${newJobId}`);
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setState('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setState('idle');
    setProgress(0);
    setError(null);
    setJobId(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Upload PDF</h1>
        <p className="text-gray-600">
          Upload an FAI LOTG exam PDF to extract quiz questions
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8">
        {state === 'idle' && (
          <>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-primary-500 bg-primary-50'
                  : file
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div>
                  <div className="text-4xl mb-4">
                    <svg className="w-12 h-12 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Choose different file
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-4">
                    <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  {isDragActive ? (
                    <p className="text-lg text-primary-600">Drop the PDF here...</p>
                  ) : (
                    <>
                      <p className="text-lg text-gray-600">
                        Drag and drop a PDF here, or click to select
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Only PDF files are accepted
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleUpload}
                disabled={!file}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload and Extract Questions
              </button>
            </div>
          </>
        )}

        {(state === 'getting-url' || state === 'uploading' || state === 'processing') && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-lg font-medium text-gray-900">
              {state === 'getting-url' && 'Preparing upload...'}
              {state === 'uploading' && `Uploading... ${progress}%`}
              {state === 'processing' && 'Processing PDF with AI...'}
            </p>
            {state === 'uploading' && (
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
            {state === 'processing' && (
              <p className="text-sm text-gray-500 mt-2">
                This may take a minute. You can check the job status later.
              </p>
            )}
          </div>
        )}

        {state === 'complete' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">
              <svg className="w-12 h-12 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Upload Complete!</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to job details...</p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">
              <svg className="w-12 h-12 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Upload Failed</p>
            <p className="text-sm text-red-600 mt-2">{error}</p>
            <button onClick={handleReset} className="mt-4 btn-secondary">
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>Upload a PDF containing LOTG exam questions</li>
          <li>Our AI extracts questions, options, and correct answers</li>
          <li>Questions are classified by IFAB Law (1-17)</li>
          <li>High-confidence extractions are auto-approved</li>
          <li>Review and approve remaining questions manually</li>
        </ol>
      </div>
    </div>
  );
}
