import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useCourses, CourseType } from "@/hooks/use-courses";
import { formatRemainingLessons } from "@/lib/formatter";
import { ChevronLeft, Pencil, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "線上課",
  material: "實體教材",
  book: "書籍",
  video: "影片",
  other: "其他",
};

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { courses, lessons, toggleLesson, isLoaded } = useCourses();
  const { toast } = useToast();

  if (!isLoaded) return null;

  const course = courses.find((c) => c.id === id);
  if (!course) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">找不到課程</p>
        <Link href="/">
          <Button variant="outline">返回首頁</Button>
        </Link>
      </div>
    );
  }

  const courseLessons = (lessons[id] || []).slice().sort((a, b) => a.lessonNumber - b.lessonNumber);
  const completedCount = courseLessons.filter((l) => l.completed).length;
  const total = course.totalLessons;
  const progress = total > 0 ? (completedCount / total) * 100 : 0;
  const isAllDone = completedCount === total && total > 0;
  const uncompletedNums = courseLessons.filter((l) => !l.completed).map((l) => l.lessonNumber);
  const remainingText = isAllDone ? "全部完成" : formatRemainingLessons(uncompletedNums);

  function handleToggle(lessonNumber: number, currentDone: boolean) {
    toggleLesson(id!, lessonNumber, !currentDone);
    if (!currentDone) {
      toast({ title: `L${lessonNumber} 已完成`, description: "繼續加油！" });
    }
  }

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full shrink-0" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground truncate leading-tight">{course.courseName}</h1>
          <p className="text-xs text-muted-foreground">{course.gradeName || "未設定年級"}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={() => setLocation(`/edit/${id}`)}
          data-testid="button-edit"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto pb-8">
        {/* Progress card */}
        <div className="m-4 bg-card rounded-2xl p-5 shadow-sm border border-border/40">
          <div className="flex flex-wrap gap-2 mb-4">
            {course.gradeName && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-2.5 py-0.5">
                {course.gradeName}
              </Badge>
            )}
            <Badge variant="outline" className="border-border/60 text-muted-foreground rounded-full px-2.5 py-0.5">
              {COURSE_TYPE_LABELS[course.courseType]}
            </Badge>
            {isAllDone && (
              <Badge className="bg-secondary text-secondary-foreground border-none rounded-full px-2.5 py-0.5">
                全部完成
              </Badge>
            )}
          </div>

          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-3xl font-bold text-foreground">{completedCount}</span>
              <span className="text-lg text-muted-foreground ml-1">/ {total}</span>
            </div>
            <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className={cn("h-full rounded-full transition-all duration-500", isAllDone ? "bg-secondary-foreground/70" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-muted-foreground">{remainingText}</p>

          {course.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border/40 pt-3 leading-relaxed">
              {course.notes}
            </p>
          )}
        </div>

        {/* Lessons list */}
        <div className="px-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            課次列表
          </p>
          {courseLessons.map((lesson) => {
            const dateStr = lesson.completedAt
              ? new Date(lesson.completedAt).toLocaleDateString("zh-TW", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
              : null;

            return (
              <button
                key={lesson.lessonNumber}
                data-testid={`lesson-item-${lesson.lessonNumber}`}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] text-left",
                  lesson.completed
                    ? "bg-secondary/40 border-secondary"
                    : "bg-card border-border/40 hover:border-primary/30"
                )}
                onClick={() => handleToggle(lesson.lessonNumber, lesson.completed)}
              >
                {lesson.completed ? (
                  <CheckCircle2 className="w-6 h-6 shrink-0 text-secondary-foreground" />
                ) : (
                  <Circle className="w-6 h-6 shrink-0 text-muted-foreground/40" />
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      lesson.completed ? "text-secondary-foreground" : "text-foreground"
                    )}
                  >
                    L{lesson.lessonNumber}
                  </span>
                  {dateStr && (
                    <p className="text-xs text-muted-foreground mt-0.5">{dateStr} 完成</p>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium shrink-0",
                    lesson.completed ? "text-secondary-foreground" : "text-muted-foreground"
                  )}
                >
                  {lesson.completed ? "已完成" : "未完成"}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
