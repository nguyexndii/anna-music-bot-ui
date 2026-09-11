import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Web Player Error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1015] flex flex-col items-center justify-center p-6 text-center text-white font-sans">
          <h2 className="text-xl font-bold mb-2 text-white">Đã xảy ra sự cố hiển thị</h2>
          <p className="text-xs text-anna-muted max-w-md mb-6 leading-relaxed">
            Trình duyệt có thể đang lưu cache phiên bản cũ. Vui lòng nhấn nút bên dưới để tải lại hoặc gõ lại lệnh <code className="text-anna-accent font-bold">/web</code> trong Discord.
          </p>
          {this.state.error?.message && (
            <p className="text-[11px] text-red-400/80 font-mono mb-4 max-w-lg px-3 py-1.5 rounded bg-red-500/10 border border-red-500/20 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-6 py-2.5 bg-anna-accent hover:bg-anna-accentHover text-white text-xs font-bold rounded-xl transition shadow-lg shadow-anna-accent/30 active:scale-95 cursor-pointer"
          >
            Làm Mới & Xóa Cache
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
