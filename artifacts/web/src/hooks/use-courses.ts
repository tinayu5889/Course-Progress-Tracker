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
        const migrated = parsed.map((c, i) => ({
          ...c,
          sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : i,
        }));
        setCourses(migrated);
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

  /** Reorder by providing a new array of course IDs in the desired order. */
  const reorderCourses = useCallback((orderedIds: string[]) => {
    const lookup = new Map(courses.map(c => [c.id, c]));
    // Assign new sortOrder for the reordered items
    const reorderedMap = new Map(orderedIds.map((id, i) => [id, i]));
    const newCourses = courses.map(c => {
      const newOrder = reorderedMap.get(c.id);
      return newOrder !== undefined ? { ...c, sortOrder: newOrder } : c;
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
    reorderCourses,
    toggleLesson,
    exportData,
    importData,
  };
}
