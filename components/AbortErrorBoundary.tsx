"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { isAbortOrCancelError } from "@/lib/isAbortError";

type Props = { children: ReactNode };
type State = { error: unknown; isAbort: boolean };

/**
 * React Error Boundary. AbortError / "signal is aborted"는 취소일 뿐이므로
 * 오버레이를 띄우지 않고 무시합니다. 그 외 에러는 상위로 전파합니다.
 */
export class AbortErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, isAbort: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return {
      error,
      isAbort: isAbortOrCancelError(error),
    };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    if (isAbortOrCancelError(error)) {
      // AbortError는 무시하고 상태만 초기화해 다음 렌더에서 children 다시 그리기
      this.setState({ error: null, isAbort: false });
    }
  }

  render() {
    if (this.state.error && !this.state.isAbort) {
      throw this.state.error;
    }
    return this.props.children;
  }
}
