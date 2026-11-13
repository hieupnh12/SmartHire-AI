import { Component, ErrorInfo, ReactNode } from "react";
import { reportClientCrash } from "@/lib/clientLog";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    reportClientCrash({
      error,
      errorInfo,
      action: "REACT_ERROR_BOUNDARY",
    });
  }

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[360px] flex items-center justify-center p-6 bg-slate-50/50">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 text-center">
            <div className="mx-auto size-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4">
              <AlertTriangle className="size-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-800 mb-1.5">
              Đã xảy ra sự cố không mong muốn
            </h2>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Hệ thống đã tự động ghi nhận nhật ký lỗi này để đội ngũ kỹ thuật xử lý. Bạn vui lòng thử tải lại trang hoặc quay lại trang chủ.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors"
              >
                <RefreshCw className="size-3.5" />
                Thử tải lại
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors"
              >
                <Home className="size-3.5" />
                Về trang chủ
              </button>
            </div>

            {isDev && this.state.error && (
              <details className="mt-6 text-left border-t border-slate-100 pt-3">
                <summary className="text-[11px] text-slate-400 cursor-pointer font-mono hover:text-slate-600">
                  Chi tiết lỗi dành cho Developer (Dev only)
                </summary>
                <div className="mt-2 p-3 bg-slate-900 text-rose-300 rounded-lg text-[10px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
