import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCourses, Course, CourseType } from "@/hooks/use-courses";
import { formatRemainingLessons } from "@/lib/formatter";
import {
  Plus, Download, Upload, Trash2, Filter, Pencil, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "線上課",
  material: "實體教材",
  book: "書籍",
  video: "影片",
  other: "其他",
};

// ─── Sortable row ──────────────────────────────────────────────────────────────

interface RowProps {
  course: Course;
  lessons: Record<string, { lessonNumber: number; completed: boolean }[]>;
  onDelete: (id: string) => void;
  isDragOverlay?: boolean;
}

function SortableRow({ course, lessons, onDelete, isDragOverlay = false }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 1 : undefined,
  };

  const courseLessons = lessons[course.id] || [];
  const completedCount = courseLessons.filter((l) => l.completed).length;
  const isCompleted = completedCount === course.totalLessons && course.totalLessons > 0;
  const progress = course.totalLessons > 0 ? (completedCount / course.totalLessons) * 100 : 0;
  const uncompletedNums = courseLessons.filter((l) => !l.completed).map((l) => l.lessonNumber);
  const remainingText = isCompleted ? "—" : formatRemainingLessons(uncompletedNums);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border-b border-border/30 last:border-0 transition-colors",
        isDragOverlay
          ? "bg-card shadow-lg rounded-xl"
          : "hover:bg-muted/40"
      )}
    >
      {/* Drag handle */}
      <td className="pl-3 pr-1 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors",
            isDragOverlay ? "cursor-grabbing" : "cursor-grab"
          )}
          tabIndex={-1}
          aria-label="拖曳排序"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>

      {/* 課程名稱 */}
      <td className="px-3 py-3">
        <Link
          href={`/course/${course.id}`}
          className="font-medium text-foreground hover:text-primary transition-colors block"
        >
          {course.courseName}
          {isCompleted && (
            <Badge className="ml-2 bg-secondary text-secondary-foreground border-none rounded-full px-2 py-0 text-[10px]">
              完成
            </Badge>
          )}
        </Link>
      </td>

      {/* 年級 */}
      <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-sm">
        {course.gradeName || <span className="text-muted-foreground/30">—</span>}
      </td>

      {/* 類型 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <Badge variant="outline" className="border-border/60 text-muted-foreground rounded-full px-2.5 py-0.5 font-normal text-xs">
          {COURSE_TYPE_LABELS[course.courseType]}
        </Badge>
      </td>

      {/* 總課數 */}
      <td className="px-3 py-3 text-right tabular-nums text-muted-foreground text-sm">
        {course.totalLessons}
      </td>

      {/* 已完成 */}
      <td className="px-3 py-3 text-right tabular-nums font-medium text-foreground text-sm">
        {completedCount}
      </td>

      {/* 剩餘課數 */}
      <td className="px-3 py-3 text-right tabular-nums text-sm">
        {isCompleted ? (
          <span className="text-muted-foreground/30">—</span>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="font-medium text-foreground">
              {course.totalLessons - completedCount}
              <span className="text-muted-foreground font-normal"> / {course.totalLessons}</span>
            </span>
            <span className="text-xs text-muted-foreground/70 truncate max-w-[140px]" title={remainingText}>
              {remainingText}
            </span>
          </div>
        )}
      </td>

      {/* 進度 */}
      <td className="px-3 py-3 w-36">
        <div className="flex items-center gap-2 justify-end">
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden shrink-0">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isCompleted ? "bg-secondary-foreground/60" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="tabular-nums text-xs text-muted-foreground w-8 text-right shrink-0">
            {Math.round(progress)}%
          </span>
        </div>
      </td>

      {/* 操作 */}
      <td className="px-3 py-3 w-20">
        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <Link href={`/edit/${course.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="編輯"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(course.id)}
            title="刪除"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Home page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { courses, lessons, isLoaded, deleteCourse, reorderCourses, exportData, importData } = useCourses();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<CourseType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  if (!isLoaded) return null;

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const success = importData(result);
      if (success) {
        toast({ title: "匯入成功", description: "課程資料已成功匯入。" });
      } else {
        toast({ title: "匯入失敗", description: "檔案格式不正確。", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Full sorted list (for drag reordering)
  const sortedCourses = [...courses].sort((a, b) => a.sortOrder - b.sortOrder);

  // Filtered view (for display)
  const filteredCourses = sortedCourses.filter((c) => {
    if (filterType !== "all" && c.courseType !== filterType) return false;
    const courseLessons = lessons[c.id] || [];
    const completedCount = courseLessons.filter((l) => l.completed).length;
    const isCompleted = completedCount === c.totalLessons && c.totalLessons > 0;
    if (filterStatus === "active" && isCompleted) return false;
    if (filterStatus === "completed" && !isCompleted) return false;
    return true;
  });

  const activeFilterCount =
    (filterType !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0);

  const activeCourse = activeId ? courses.find(c => c.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedCourses.findIndex(c => c.id === active.id);
    const newIndex = sortedCourses.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sortedCourses, oldIndex, newIndex);
    reorderCourses(reordered.map(c => c.id));
  }

  // IDs for SortableContext: use filtered list so drag works correctly within the visible set
  const sortableIds = filteredCourses.map(c => c.id);

  return (
    <div className="flex flex-col h-full bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">課程使用紀錄</h1>
          <p className="text-xs text-muted-foreground mt-0.5">你的專屬學習夥伴</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">狀態</div>
              <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                <span className={filterStatus === "all" ? "font-bold text-primary" : ""}>全部</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("active")}>
                <span className={filterStatus === "active" ? "font-bold text-primary" : ""}>進行中</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus("completed")}>
                <span className={filterStatus === "completed" ? "font-bold text-primary" : ""}>已完成</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">類型</div>
              <DropdownMenuItem onClick={() => setFilterType("all")}>
                <span className={filterType === "all" ? "font-bold text-primary" : ""}>全部類型</span>
              </DropdownMenuItem>
              {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map((type) => (
                <DropdownMenuItem key={type} onClick={() => setFilterType(type)}>
                  <span className={filterType === type ? "font-bold text-primary" : ""}>{COURSE_TYPE_LABELS[type]}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={exportData}>
                <Download className="w-4 h-4 mr-2" /> 匯出資料
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> 匯入資料
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/add">
            <Button size="sm" className="rounded-full px-4 h-9 gap-1.5">
              <Plus className="w-4 h-4" />
              新增課程
            </Button>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-auto p-4">
        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium text-foreground">還沒有課程</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
              點擊右上角的按鈕，開始記錄你的學習進度吧。
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/50">
                    {/* Handle column */}
                    <th className="w-8 pl-3" />
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">課程名稱</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">年級</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">類型</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">總課數</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">已完成</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap">剩餘課數</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap w-36">進度</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                  <tbody>
                    {filteredCourses.map((course) => (
                      <SortableRow
                        key={course.id}
                        course={course}
                        lessons={lessons}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>

              {/* Drag overlay — floating ghost row while dragging */}
              <DragOverlay dropAnimation={null}>
                {activeCourse ? (
                  <table className="w-full text-sm table-fixed" style={{ width: "100%" }}>
                    <tbody>
                      <SortableRow
                        course={activeCourse}
                        lessons={lessons}
                        onDelete={() => {}}
                        isDragOverlay
                      />
                    </tbody>
                  </table>
                ) : null}
              </DragOverlay>
            </DndContext>

            <div className="px-4 py-2 border-t border-border/30 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                共 {filteredCourses.length} 筆課程
                {activeFilterCount > 0 && (
                  <button
                    className="ml-2 underline hover:text-foreground transition-colors"
                    onClick={() => { setFilterType("all"); setFilterStatus("all"); }}
                  >
                    清除篩選
                  </button>
                )}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-[320px] rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">刪除課程</DialogTitle>
            <DialogDescription className="text-center pt-2">
              確定要刪除這個課程嗎？此操作無法復原。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 mt-4 sm:justify-center">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteId(null)}>取消</Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl"
              onClick={() => {
                if (deleteId) {
                  deleteCourse(deleteId);
                  setDeleteId(null);
                  toast({ title: "已刪除課程" });
                }
              }}
            >
              確定刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
