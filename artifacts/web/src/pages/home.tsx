import { useState, useRef } from "react";
import { Link } from "wouter";
import { useCourses, CourseType } from "@/hooks/use-courses";
import { formatRemainingLessons } from "@/lib/formatter";
import { Plus, Download, Upload, Trash2, Filter } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "線上課",
  material: "實體教材",
  book: "書籍",
  video: "影片",
  other: "其他"
};

export default function Home() {
  const { courses, lessons, isLoaded, deleteCourse, exportData, importData } = useCourses();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filterType, setFilterType] = useState<CourseType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed">("all");
  
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const filteredCourses = courses.filter(c => {
    if (filterType !== "all" && c.courseType !== filterType) return false;
    
    const courseLessons = lessons[c.id] || [];
    const completedCount = courseLessons.filter(l => l.completed).length;
    const isCompleted = completedCount === c.totalLessons && c.totalLessons > 0;
    
    if (filterStatus === "active" && isCompleted) return false;
    if (filterStatus === "completed" && !isCompleted) return false;
    
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">課程使用紀錄</h1>
          <p className="text-xs text-muted-foreground mt-0.5">你的專屬學習夥伴</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <Filter className="w-4 h-4" />
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
              {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map(type => (
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
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {filteredCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-primary/60" />
            </div>
            <h3 className="text-lg font-medium text-foreground">還沒有課程</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
              點擊下方的按鈕，開始記錄你的學習進度吧。
            </p>
          </div>
        ) : (
          filteredCourses.map(course => {
            const courseLessons = lessons[course.id] || [];
            const completedCount = courseLessons.filter(l => l.completed).length;
            const isCompleted = completedCount === course.totalLessons;
            const progress = course.totalLessons > 0 ? (completedCount / course.totalLessons) * 100 : 0;
            const uncompletedNums = courseLessons.filter(l => !l.completed).map(l => l.lessonNumber);
            const remainingText = isCompleted ? "全部完成" : `剩下：${formatRemainingLessons(uncompletedNums)}`;

            return (
              <div 
                key={course.id}
                className="group relative bg-card rounded-2xl p-4 shadow-sm border border-border/40 transition-all active:scale-[0.98] animate-in fade-in slide-in-from-bottom-4 duration-300"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteId(course.id);
                }}
              >
                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(course.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Link href={`/course/${course.id}`} className="block">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-2.5 py-0.5 rounded-full font-medium">
                      {course.gradeName}
                    </Badge>
                    <Badge variant="outline" className="bg-background px-2.5 py-0.5 rounded-full text-muted-foreground border-border/60">
                      {COURSE_TYPE_LABELS[course.courseType]}
                    </Badge>
                    {isCompleted && (
                      <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary border-none px-2.5 py-0.5 rounded-full font-medium">
                        已完成
                      </Badge>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-foreground leading-tight mb-4 pr-8">
                    {course.courseName}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{completedCount} / {course.totalLessons} 完課</span>
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2.5 rounded-full bg-muted overflow-hidden" indicatorClassName={isCompleted ? "bg-secondary" : "bg-primary"} />
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                      {remainingText}
                    </p>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </main>

      <div className="fixed bottom-6 right-0 left-0 flex justify-center z-20 pointer-events-none px-4 max-w-md mx-auto">
        <Link 
          href="/add" 
          className="pointer-events-auto bg-primary text-primary-foreground h-14 px-8 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2 font-bold hover:bg-primary/90 active:scale-95 transition-all w-full max-w-[280px]"
        >
          <Plus className="w-5 h-5" />
          新增課程
        </Link>
      </div>

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
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={() => {
              if (deleteId) {
                deleteCourse(deleteId);
                setDeleteId(null);
                toast({ title: "已刪除課程" });
              }
            }}>確定刪除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
