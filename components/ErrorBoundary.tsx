/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomError />}>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean; // Show error details in dev mode
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // TODO: Log to error reporting service (Sentry, Bugsnag, etc.)
    // Example: logErrorToService(error, errorInfo);

    // Update state with error info
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Icon/Illustration */}
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>⚠️</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>Oops! Something went wrong</Text>

              {/* Message */}
              <Text style={styles.message}>
                We're sorry for the inconvenience. The app encountered an unexpected error.
              </Text>

              {/* Error details (dev mode only) */}
              {(__DEV__ || this.props.showDetails) && this.state.error && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Error Details:</Text>
                  <View style={styles.errorBox}>
                    <Text style={styles.errorName}>
                      {this.state.error.name || 'Error'}
                    </Text>
                    <Text style={styles.errorMessage}>
                      {this.state.error.message}
                    </Text>
                    {this.state.error.stack && (
                      <Text style={styles.errorStack}>
                        {this.state.error.stack}
                      </Text>
                    )}
                  </View>

                  {this.state.errorInfo?.componentStack && (
                    <>
                      <Text style={styles.detailsTitle}>Component Stack:</Text>
                      <View style={styles.errorBox}>
                        <Text style={styles.componentStack}>
                          {this.state.errorInfo.componentStack}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  title="Try Again"
                  onPress={this.handleReset}
                  variant="primary"
                  style={styles.button}
                />
                
                {/* Optional: Report button */}
                {!__DEV__ && (
                  <Button
                    title="Report Issue"
                    onPress={() => {
                      // TODO: Navigate to feedback/support screen
                      console.log('Report issue clicked');
                    }}
                    variant="outline"
                    style={styles.button}
                  />
                )}
              </View>

              {/* Helper text */}
              <Text style={styles.helperText}>
                If the problem persists, please try restarting the app or contact support.
              </Text>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 32,
  },
  detailsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#B91C1C',
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    lineHeight: 16,
  },
  componentStack: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
    lineHeight: 16,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    width: '100%',
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
