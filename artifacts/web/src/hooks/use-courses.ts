import { useState, useEffect, useCallback } from 'react';

export type CourseType = "online" | "material" | "book" | "video" | "other";

export interface Course {
  id: string;
  gradeName: string;
  courseName: string;
  courseType: CourseType;
  totalLessons: number;
  notes: string;
  createdAt: string;
  sortOrder: number;
}

export interface Lesson {
  courseId: string;
  lessonNumber: number;
  completed: boolean;
  completedAt: string | null;
}

export type LessonsMap = Record<string, Lesson[]>;

export interface ExportData {
  courses: Course[];
  lessons: LessonsMap;
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<LessonsMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedCourses = localStorage.getItem('courses');
      const storedLessons = localStorage.getItem('lessons');
      if (storedCourses) {
        const parsed: Course[] = JSON.parse(storedCourses);
        // Migrate: assign sortOrder to any course that doesn't have it
        const migrated = parsed.map((c, i) => ({
          ...c,
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
        }));
        setCourses(migrated);
        // Persist migration immediately so refreshes are consistent
        localStorage.setItem('courses', JSON.stringify(migrated));
      }
      if (storedLessons) setLessons(JSON.parse(storedLessons));
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveState = useCallback((newCourses: Course[], newLessons: LessonsMap) => {
    setCourses(newCourses);
    setLessons(newLessons);
    localStorage.setItem('courses', JSON.stringify(newCourses));
    localStorage.setItem('lessons', JSON.stringify(newLessons));
  }, []);

  const addCourse = useCallback((courseData: Omit<Course, 'id' | 'createdAt' | 'sortOrder'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const maxOrder = courses.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), -1);
    const newCourse: Course = {
      ...courseData,
      id,
      createdAt: new Date().toISOString(),
      sortOrder: maxOrder + 1,
    };

    const newLessonsList: Lesson[] = Array.from({ length: courseData.totalLessons }, (_, i) => ({
      courseId: id,
      lessonNumber: i + 1,
      completed: false,
      completedAt: null,
    }));

    const newCourses = [...courses, newCourse];
    const newLessons = { ...lessons, [id]: newLessonsList };

    saveState(newCourses, newLessons);
    return id;
  }, [courses, lessons, saveState]);

  const updateCourse = useCallback((id: string, courseData: Omit<Course, 'id' | 'createdAt' | 'sortOrder'>) => {
    const existingCourse = courses.find(c => c.id === id);
    if (!existingCourse) return;

    const newCourse = { ...existingCourse, ...courseData };
    const newCourses = courses.map(c => c.id === id ? newCourse : c);

    let currentLessons = [...(lessons[id] || [])];

    if (courseData.totalLessons > existingCourse.totalLessons) {
      const additional = Array.from(
        { length: courseData.totalLessons - existingCourse.totalLessons },
        (_, i) => ({
          courseId: id,
          lessonNumber: existingCourse.totalLessons + i + 1,
          completed: false,
          completedAt: null,
        })
      );
      currentLessons = [...currentLessons, ...additional];
    } else if (courseData.totalLessons < existingCourse.totalLessons) {
      currentLessons = currentLessons.slice(0, courseData.totalLessons);
    }

    const newLessons = { ...lessons, [id]: currentLessons };
    saveState(newCourses, newLessons);
  }, [courses, lessons, saveState]);

  const deleteCourse = useCallback((id: string) => {
    const newCourses = courses.filter(c => c.id !== id);
    const newLessons = { ...lessons };
    delete newLessons[id];
    saveState(newCourses, newLessons);
  }, [courses, lessons, saveState]);

  const moveCourse = useCallback((id: string, direction: 'up' | 'down') => {
    const sorted = [...courses].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(c => c.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const aOrder = sorted[idx].sortOrder;
    const bOrder = sorted[swapIdx].sortOrder;

    const newCourses = courses.map(c => {
      if (c.id === sorted[idx].id) return { ...c, sortOrder: bOrder };
      if (c.id === sorted[swapIdx].id) return { ...c, sortOrder: aOrder };
      return c;
    });
    saveState(newCourses, lessons);
  }, [courses, lessons, saveState]);

  const toggleLesson = useCallback((courseId: string, lessonNumber: number, completed: boolean) => {
    const courseLessons = lessons[courseId];
    if (!courseLessons) return;

    const updatedLessons = courseLessons.map(l =>
      l.lessonNumber === lessonNumber
        ? { ...l, completed, completedAt: completed ? new Date().toISOString() : null }
        : l
    );

    const newLessons = { ...lessons, [courseId]: updatedLessons };
    saveState(courses, newLessons);
  }, [courses, lessons, saveState]);

  const exportData = useCallback(() => {
    const data: ExportData = { courses, lessons };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [courses, lessons]);

  const importData = useCallback((jsonData: string) => {
    try {
      const data: ExportData = JSON.parse(jsonData);
      if (data.courses && data.lessons) {
        // Migrate sortOrder on import too
        const migrated = data.courses.map((c, i) => ({
          ...c,
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
        }));
        saveState(migrated, data.lessons);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to parse import data", e);
      return false;
    }
  }, [saveState]);

  return {
    courses,
    lessons,
    isLoaded,
    addCourse,
    updateCourse,
    deleteCourse,
    moveCourse,
    toggleLesson,
    exportData,
    importData
  };
}
