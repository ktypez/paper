import { FileQuestion } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[60dvh] place-items-center">
      <EmptyState
        icon={FileQuestion}
        title="ไม่พบหน้านี้"
        description="ลิงก์อาจไม่ถูกต้อง หรือหน้าที่เปิดถูกย้ายไปแล้ว"
        action={
          <Button asChild variant="primary">
            <Link to="/">กลับหน้าล่าสุด</Link>
          </Button>
        }
      />
    </div>
  );
}
