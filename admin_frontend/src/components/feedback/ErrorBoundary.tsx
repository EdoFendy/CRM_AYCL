import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { I18nContext } from '@i18n/I18nContext';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary caught', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const { t } = this.context;
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-muted p-6 text-center">
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">{t('feedback.unexpectedErrorTitle')}</h2>
            <p className="text-sm text-slate-600">{t('feedback.unexpectedErrorBody')}</p>
            {this.state.error && (
              <pre className="overflow-auto rounded-md bg-slate-900/90 p-4 text-left text-xs text-white">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
            >
              {t('feedback.tryAgain')}
            </button>
            <Link
              to="/support"
              className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10"
            >
              {t('layout.supportLink')}
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
