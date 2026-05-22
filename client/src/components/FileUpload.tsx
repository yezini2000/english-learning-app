// 文件上传组件 - 拖拽上传 + 进度显示 + 错误处理
import { useState, useCallback, useRef } from 'react';
import { uploadFile, getFileStatus } from '../services/api';
import type { FileStatus } from '../types/index';

const SUPPORTED_FORMATS = ['txt', 'pdf', 'docx', 'srt', 'md', 'mp3', 'wav', 'm4a', 'mp4', 'webm', 'mkv'];
const POLL_INTERVAL = 2000; // 2秒轮询
const MAX_POLL_TIME = 300000; // 300秒超时

export function FileUpload({ onComplete }: { onComplete?: (fileId: string) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileStatus(null);
    setUploading(true);

    try {
      const result = await uploadFile(file);
      setUploading(false);
      setProcessing(true);

      // 轮询处理状态
      await pollStatus(result.id);
    } catch (err) {
      setUploading(false);
      setError((err as Error).message);
    }
  }, []);

  const pollStatus = async (fileId: string) => {
    const startTime = Date.now();

    const poll = async () => {
      if (Date.now() - startTime > MAX_POLL_TIME) {
        setProcessing(false);
        setError('处理超时（超过 300 秒），请重试');
        return;
      }

      try {
        const status = await getFileStatus(fileId);
        setFileStatus(status);

        if (status.status === 'completed') {
          setProcessing(false);
          if (status.errorMessage) {
            setError(status.errorMessage);
          } else {
            onComplete?.(fileId);
          }
        } else if (status.status === 'failed') {
          setProcessing(false);
          setError(status.errorMessage || '处理失败');
        } else {
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch {
        setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => fileInputRef.current?.click();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRetry = () => {
    setError(null);
    setFileStatus(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        style={{
          border: `2px dashed ${isDragging ? '#4299e1' : '#cbd5e0'}`,
          borderRadius: '8px',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#ebf8ff' : '#f7fafc',
          transition: 'all 0.2s',
        }}
      >
        <p style={{ fontSize: '18px', marginBottom: '8px' }}>
          {isDragging ? '松开以上传文件' : '拖拽文件到此处或点击选择'}
        </p>
        <p style={{ fontSize: '14px', color: '#718096' }}>
          支持格式：{SUPPORTED_FORMATS.join(', ')}
        </p>
        <p style={{ fontSize: '12px', color: '#a0aec0' }}>
          最大文件大小：500MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleInputChange}
        accept={SUPPORTED_FORMATS.map(f => `.${f}`).join(',')}
        style={{ display: 'none' }}
      />

      {/* 上传进度 */}
      {uploading && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }}>⏳</div>
          <p>正在上传...</p>
        </div>
      )}

      {/* 处理状态 */}
      {processing && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 8px' }}>⚙️</div>
          <p>正在处理文件...</p>
          {fileStatus && <p style={{ fontSize: '12px', color: '#718096' }}>状态: {fileStatus.status}</p>}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: '#fed7d7', borderRadius: '4px' }}>
          <p style={{ color: '#c53030', margin: '0 0 8px' }}>{error}</p>
          <button
            onClick={handleRetry}
            style={{
              padding: '6px 12px',
              background: '#e53e3e',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
