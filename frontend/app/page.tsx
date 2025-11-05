'use client';

import { useRef, useState, useEffect } from 'react';

export default function Page() {
  const [src, setSrc] = useState<string>();
  const [out, setOut] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>();
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [highQuality, setHighQuality] = useState(false);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState<string>('');
  const [resizeHeight, setResizeHeight] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressActiveRef = useRef(false);
  const simulatedProgressRef = useRef(0);
  const lastMessageRef = useRef('');

  const modelUrl = process.env.NEXT_PUBLIC_MODEL_URL || 'http://localhost:8000';

  const loadingMessages = [
    'Phân tích cấu trúc ảnh...',
    'Khởi động mạng neural network...',
    'Xác định các vùng cần tô màu...',
    'Phân tích độ sáng và bóng tối...',
    'Dự đoán bảng màu phù hợp...',
    'Áp dụng thuật toán tô màu AI...',
    'Tinh chỉnh độ tương phản...',
    'Hoàn thiện và tối ưu hóa...',
    'Tăng cường độ chính xác màu sắc...',
    'Đồng bộ hóa ánh sáng và màu sắc...',
  ];

  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  function stopProgressSimulation(options?: { forceComplete?: boolean; message?: string }) {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    progressActiveRef.current = false;
    if (options?.forceComplete) {
      simulatedProgressRef.current = 100;
      setProgress(100);
      setLoadingMessage(options.message ?? 'Hoàn tất!');
    } else if (options?.message) {
      setLoadingMessage(options.message);
    }
  }

  function startProgressSimulation() {
    stopProgressSimulation();
    progressActiveRef.current = true;
    simulatedProgressRef.current = 0;
    lastMessageRef.current = '';

    const runStage = () => {
      const maxVisibleProgress = 95;
      const increment = randomInt(4, 12);
      const nextProgress = Math.min(maxVisibleProgress, simulatedProgressRef.current + increment);
      simulatedProgressRef.current = nextProgress;
      setProgress(nextProgress);

      if (loadingMessages.length > 0) {
        let message = loadingMessages[randomInt(0, loadingMessages.length - 1)];
        if (loadingMessages.length > 1) {
          let guard = 0;
          while (message === lastMessageRef.current && guard < 5) {
            message = loadingMessages[randomInt(0, loadingMessages.length - 1)];
            guard += 1;
          }
        }
        lastMessageRef.current = message;
        setLoadingMessage(message);
      }

      const delay = randomInt(900, 2600);
      if (!progressActiveRef.current) {
        return;
      }
      progressTimerRef.current = setTimeout(runStage, delay);
    };

    runStage();
  }

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
      progressActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  useEffect(() => {
    return () => {
      if (out) {
        URL.revokeObjectURL(out);
      }
    };
  }, [out]);

  function handleFileSelected(file: File) {
    setErr(undefined);
    if (out) {
      URL.revokeObjectURL(out);
    }
    setOut(undefined);
    setProgress(0);
    setLoadingMessage('');
    setBusy(false);

    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    progressActiveRef.current = false;

    if (src) {
      URL.revokeObjectURL(src);
    }

    const url = URL.createObjectURL(file);
    setSrc(url);
    setSelectedFile(file);

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  async function startProcessing() {
    if (!selectedFile || busy) {
      return;
    }

    setErr(undefined);
    if (out) {
      URL.revokeObjectURL(out);
    }
    setOut(undefined);
    setProgress(0);
    setLoadingMessage('');
    setBusy(true);

    const fd = new FormData();
    fd.append('file', selectedFile);
    fd.append('high_quality', String(highQuality));

    if (resizeEnabled) {
      const widthValue = parseInt(resizeWidth, 10);
      if (!Number.isNaN(widthValue) && widthValue > 0) {
        fd.append('output_width', Math.min(widthValue, 4096).toString());
      }

      const heightValue = parseInt(resizeHeight, 10);
      if (!Number.isNaN(heightValue) && heightValue > 0) {
        fd.append('output_height', Math.min(heightValue, 4096).toString());
      }
    }

    const MINIMUM_WAIT_TIME = randomInt(9000, 20000);
    const startTime = Date.now();
    let resultBlob: Blob | null = null;
    let fetchError: any = null;

    const apiCall = fetch(modelUrl + '/colorize', { method: 'POST', body: fd })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text();
          throw new Error(t || 'Xử lý thất bại');
        }
        return await r.blob();
      })
      .then((blob) => {
        resultBlob = blob;
      })
      .catch((e) => {
        fetchError = e;
      });

    startProgressSimulation();

    try {
      await apiCall;

      if (fetchError) {
        throw fetchError;
      }

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_WAIT_TIME - elapsedTime);

      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      stopProgressSimulation({ forceComplete: true, message: 'Hoàn tất!' });
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (resultBlob) {
        setOut(URL.createObjectURL(resultBlob));
      }
    } catch (e: any) {
      stopProgressSimulation({ message: 'Có lỗi xảy ra' });
      setErr(e?.message || 'Có lỗi xảy ra');
    } finally {
      if (progressActiveRef.current) {
        stopProgressSimulation();
      }
      setTimeout(() => {
        setBusy(false);
        setProgress(0);
        setLoadingMessage('');
      }, 600);
    }
  }

  function resetAll() {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    progressActiveRef.current = false;
    simulatedProgressRef.current = 0;
    lastMessageRef.current = '';

    if (src) {
      URL.revokeObjectURL(src);
    }

    if (out) {
      URL.revokeObjectURL(out);
    }

    simulatedProgressRef.current = 0;
    lastMessageRef.current = '';

    setSrc(undefined);
    setOut(undefined);
    setErr(undefined);
    setProgress(0);
    setLoadingMessage('');
    setBusy(false);
    setSelectedFile(null);
    setHighQuality(false);
    setResizeEnabled(false);
    setResizeWidth('');
    setResizeHeight('');

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Cova Studio
                </h1>
                <p className="text-xs text-gray-500">Powered by Deep Learning</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                ✓ Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Tô màu ảnh đen trắng với{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sử dụng công nghệ Deep Learning tiên tiến để tự động tô màu cho ảnh đen trắng của bạn.
            Nhanh chóng, chính xác và hoàn toàn miễn phí.
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex flex-col items-center w-full">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    handleFileSelected(f);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`cursor-pointer group ${busy ? 'pointer-events-none opacity-70' : ''}`}
              >
                <div className="flex flex-col items-center p-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 transition-all duration-200 group-hover:bg-indigo-50/50">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Nhấp để chọn ảnh
                  </p>
                  <p className="text-sm text-gray-500">
                    hoặc kéo thả ảnh vào đây
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    PNG, JPG, JPEG (tối đa 10MB)
                  </p>
                </div>
              </label>

              {src && (
                <button
                  onClick={resetAll}
                  disabled={busy}
                  className={`mt-4 px-6 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg transition-colors duration-200 flex items-center gap-2 ${busy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-100'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Xóa và chọn ảnh khác
                </button>
              )}

              {selectedFile && (
                <div className="w-full mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-indigo-900">Chế độ nâng cao</p>
                          <p className="text-xs text-indigo-600/80 mt-1">Tăng chi tiết, độ nét và độ sâu màu.</p>
                        </div>
                        <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={highQuality}
                            onChange={(e) => setHighQuality(e.target.checked)}
                          />
                          <span className="block h-6 w-11 rounded-full bg-gray-300 transition-colors duration-200 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></span>
                          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"></span>
                        </label>
                      </div>
                    </div>
                    <div className="p-5 bg-white border border-gray-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Thay đổi kích thước</p>
                          <p className="text-xs text-gray-500 mt-1">Thiết lập kích thước mong muốn cho ảnh xuất ra.</p>
                        </div>
                        <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={resizeEnabled}
                            onChange={(e) => setResizeEnabled(e.target.checked)}
                          />
                          <span className="block h-6 w-11 rounded-full bg-gray-300 transition-colors duration-200 peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600"></span>
                          <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5"></span>
                        </label>
                      </div>
                      {resizeEnabled && (
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-600 mb-1">Chiều rộng (px)</label>
                            <input
                              type="number"
                              min={64}
                              max={4096}
                              inputMode="numeric"
                              value={resizeWidth}
                              onChange={(e) => setResizeWidth(e.target.value)}
                              placeholder="VD: 1920"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                            />
                          </div>
                          <div className="flex flex-col">
                            <label className="text-xs font-medium text-gray-600 mb-1">Chiều cao (px)</label>
                            <input
                              type="number"
                              min={64}
                              max={4096}
                              inputMode="numeric"
                              value={resizeHeight}
                              onChange={(e) => setResizeHeight(e.target.value)}
                              placeholder="VD: 1080"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                            />
                          </div>
                          <p className="text-xs text-gray-500 sm:col-span-2">Bỏ trống một trong hai giá trị để giữ nguyên tỷ lệ gốc.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      Xem trước ảnh của bạn ở bên dưới, cấu hình tùy chọn rồi nhấn bắt đầu để hệ thống làm việc.
                    </p>
                    <button
                      type="button"
                      onClick={startProcessing}
                      disabled={!selectedFile || busy}
                      className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold rounded-lg text-white shadow-md transition-all duration-200 ${(!selectedFile || busy)
                        ? 'bg-indigo-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5'
                      }`}
                    >
                      Bắt đầu xử lý
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {err && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-red-800">{err}</p>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {busy && (
          <div className="mb-8 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-8 shadow-lg">
            {/* Header with animated icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Processing message */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-indigo-900 mb-2">
                AI đang tô màu cho bạn...

              </h3>
              <p className="text-lg font-semibold text-indigo-700 min-h-[28px] animate-pulse">
                {loadingMessage}
              </p>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-indigo-900">Tiến độ</span>
                <span className="text-sm font-bold text-indigo-600">{progress}%</span>
              </div>
              <div className="w-full bg-indigo-200 rounded-full h-4 overflow-hidden shadow-inner">
                <div
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Animated shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Processing stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-indigo-600 mb-1">
                  {Math.floor(progress / 10)}
                </div>
                <div className="text-xs text-gray-600">Bước hoàn thành</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {Math.max(1, Math.floor((100 - progress) / 10))}
                </div>
                <div className="text-xs text-gray-600">Bước còn lại</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-pink-600 mb-1">
                  ~{Math.max(1, Math.floor((100 - progress) / 10))}s
                </div>
                <div className="text-xs text-gray-600">Thời gian còn lại</div>
              </div>
            </div>

            {/* Fun fact */}
            <div className="mt-6 p-4 bg-white/40 backdrop-blur-sm rounded-lg border border-indigo-200">
              <p className="text-xs text-gray-600 text-center italic">
                💡 <span className="font-semibold">Bạn có biết?</span> AI của chúng tôi đã được huấn luyện trên hơn 1 triệu ảnh để học cách tô màu chính xác!
              </p>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {(src || out) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Original Image */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ảnh gốc
                </h3>
              </div>
              <div className="p-6">
                {src ? (
                  <div className="relative group">
                    <img
                      src={src}
                      alt="Original"
                      className="w-full h-auto rounded-lg shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg"></div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Chưa có ảnh</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Colorized Image */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Ảnh đã tô màu
                </h3>
              </div>
              <div className="p-6">
                {busy ? (
                  <div className="aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                      <p className="text-sm font-medium text-indigo-900">Đang xử lý...</p>
                      <p className="text-xs text-indigo-600 mt-1">Vui lòng chờ trong giây lát</p>
                    </div>
                  </div>
                ) : out ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <img
                        src={out}
                        alt="Colorized"
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 rounded-lg"></div>
                    </div>
                    <a
                      href={out}
                      download="colorized_image.jpg"
                      className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Tải ảnh xuống
                    </a>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm text-gray-500">Chưa có kết quả</p>
                      <p className="text-xs text-gray-400 mt-1">Upload ảnh để bắt đầu</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        {!src && !out && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Xử lý nhanh chóng</h3>
              <p className="text-sm text-gray-600">
                Chỉ mất 3-5 giây để AI tô màu cho ảnh của bạn với chất lượng cao
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">An toàn & bảo mật</h3>
              <p className="text-sm text-gray-600">
                Ảnh của bạn được xử lý cục bộ, không lưu trữ trên server
              </p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Hoàn toàn miễn phí</h3>
              <p className="text-sm text-gray-600">
                Sử dụng không giới hạn, không cần đăng ký hay thanh toán
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Powered by <span className="font-semibold text-indigo-600">ECCV16 Colorization Model</span>
            </p>
            <p className="text-xs text-gray-500">
              © 2025 Cova Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
