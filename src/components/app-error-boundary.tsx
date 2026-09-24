import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Paper render failed", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-5 text-ink">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">เปิด Paper ไม่สำเร็จ</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            หน้านี้พบข้อผิดพลาดระหว่างทำงาน หากมีรายการค้างอยู่ ให้ตรวจสอบก่อนทำซ้ำ
          </p>
          <Button className="mt-6" variant="primary" onClick={() => window.location.reload()}>
            โหลดหน้าใหม่
          </Button>
        </div>
      </main>
    );
  }
}
