import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useCourses, CourseType } from "@/hooks/use-courses";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const COURSE_TYPES: CourseType[] = ["online", "material", "book", "video", "other"];
const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "線上課",
  material: "實體教材",
  book: "書籍",
  video: "影片",
  other: "其他",
};

export default function CourseForm() {
  const { id } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { courses, addCourse, updateCourse, isLoaded } = useCourses();
  const { toast } = useToast();

  const isEdit = !!id;
  const existingCourse = isEdit ? courses.find((c) => c.id === id) : null;

  const [courseName, setCourseName] = useState("");
  const [gradeName, setGradeName] = useState("");
  const [courseType, setCourseType] = useState<CourseType>("online");
  const [totalLessons, setTotalLessons] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingCourse) {
      setCourseName(existingCourse.courseName);
      setGradeName(existingCourse.gradeName);
      setCourseType(existingCourse.courseType);
      setTotalLessons(existingCourse.totalLessons.toString());
      setNotes(existingCourse.notes);
    }
  }, [existingCourse]);

  if (!isLoaded) return null;

  if (isEdit && !existingCourse) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">找不到課程</p>
        <Link href="/">
          <Button variant="outline">返回首頁</Button>
        </Link>
      </div>
    );
  }

  const canSave = courseName.trim().length > 0 && parseInt(totalLessons, 10) > 0;

  function handleSave() {
    if (!canSave || saving) return;
    const total = parseInt(totalLessons, 10);
    setSaving(true);

    const data = {
      courseName: courseName.trim(),
      gradeName: gradeName.trim(),
      courseType,
      totalLessons: total,
      notes: notes.trim(),
    };

    if (isEdit && id) {
      updateCourse(id, data);
      toast({ title: "課程已更新" });
      setLocation(`/course/${id}`);
    } else {
      const newId = addCourse(data);
      toast({ title: "課程已新增", description: `已自動產生 L1 至 L${total}` });
      setLocation(`/course/${newId}`);
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => (isEdit ? setLocation(`/course/${id}`) : setLocation("/"))}
          data-testid="button-back"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-foreground">
            {isEdit ? "編輯課程" : "新增課程"}
          </h1>
        </div>
        <Button
          size="sm"
          className="rounded-full px-4 h-9"
          disabled={!canSave || saving}
          onClick={handleSave}
          data-testid="button-save"
        >
          <Check className="w-4 h-4 mr-1" />
          儲存
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-5 pb-10">
        {/* Course name */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            課程名稱 <span className="text-destructive">*</span>
          </Label>
          <Input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="輸入課程名稱"
            className="bg-card border-border/60 rounded-xl h-12 text-base"
            autoFocus={!isEdit}
            data-testid="input-course-name"
          />
        </div>

        {/* Grade */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            適合年級
          </Label>
          <Input
            value={gradeName}
            onChange={(e) => setGradeName(e.target.value)}
            placeholder="例如：一年級、3-5年級"
            className="bg-card border-border/60 rounded-xl h-12 text-base"
            data-testid="input-grade-name"
          />
        </div>

        {/* Course type */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            課程類型
          </Label>
          <div className="flex flex-wrap gap-2">
            {COURSE_TYPES.map((type) => (
              <button
                key={type}
                data-testid={`type-chip-${type}`}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium border transition-all active:scale-95",
                  courseType === type
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/40"
                )}
                onClick={() => setCourseType(type)}
              >
                {COURSE_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Total lessons */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            總課數 <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            value={totalLessons}
            onChange={(e) => setTotalLessons(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="輸入課程總數（如：15）"
            className="bg-card border-border/60 rounded-xl h-12 text-base"
            data-testid="input-total-lessons"
          />
          {totalLessons && parseInt(totalLessons, 10) > 0 && (
            <p className="text-xs text-muted-foreground pl-1">
              將自動產生 L1 至 L{totalLessons}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            備註
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="選填備註..."
            rows={3}
            className="bg-card border-border/60 rounded-xl text-base resize-none"
            data-testid="input-notes"
          />
        </div>

        {/* Save button (bottom) */}
        <Button
          className="w-full h-14 rounded-2xl text-base font-bold mt-2 shadow-lg shadow-primary/20"
          disabled={!canSave || saving}
          onClick={handleSave}
          data-testid="button-save-bottom"
        >
          <Check className="w-5 h-5 mr-2" />
          {isEdit ? "儲存變更" : "新增課程"}
        </Button>
      </main>
    </div>
  );
}
