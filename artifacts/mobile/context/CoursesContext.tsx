import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CourseType = "online" | "material" | "book" | "video" | "other";

export const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  online: "線上課",
  material: "實體教材",
  book: "書籍",
  video: "影片",
  other: "其他",
};

export const COURSE_TYPES: CourseType[] = [
  "online",
  "material",
  "book",
  "video",
  "other",
];

export interface Course {
  id: string;
  gradeName: string;
  courseName: string;
  courseType: CourseType;
  totalLessons: number;
  notes: string;
  createdAt: string;
}

export interface Lesson {
  courseId: string;
  lessonNumber: number;
  completed: boolean;
  completedAt: string | null;
}

interface CoursesData {
  courses: Course[];
  lessons: Record<string, Lesson[]>;
}

interface CoursesContextType {
  courses: Course[];
  lessons: Record<string, Lesson[]>;
  addCourse: (
    data: Omit<Course, "id" | "createdAt">
  ) => Promise<void>;
  updateCourse: (
    id: string,
    data: Omit<Course, "id" | "createdAt">
  ) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  toggleLesson: (courseId: string, lessonNumber: number) => Promise<void>;
  exportData: () => string;
  importData: (json: string) => Promise<boolean>;
  getCourseLessons: (courseId: string) => Lesson[];
  getCompletedCount: (courseId: string) => number;
  getRemainingText: (courseId: string) => string;
}

const STORAGE_KEY = "@course_tracker_data";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function formatRemainingLessons(lessons: Lesson[]): string {
  const nums = lessons
    .filter((l) => !l.completed)
    .map((l) => l.lessonNumber)
    .sort((a, b) => a - b);

  if (nums.length === 0) return "全部完成";

  const groups: string[] = [];
  let start = nums[0];
  let end = nums[0];

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === end + 1) {
      end = nums[i];
    } else {
      groups.push(start === end ? `L${start}` : `L${start}-L${end}`);
      start = nums[i];
      end = nums[i];
    }
  }
  groups.push(start === end ? `L${start}` : `L${start}-L${end}`);

  return groups.join(", ");
}

const CoursesContext = createContext<CoursesContextType | null>(null);

export function CoursesProvider({ children }: { children: React.ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: CoursesData = JSON.parse(raw);
        setCourses(data.courses ?? []);
        setLessons(data.lessons ?? {});
      }
    } catch (e) {}
  }

  async function saveData(
    newCourses: Course[],
    newLessons: Record<string, Lesson[]>
  ) {
    const data: CoursesData = { courses: newCourses, lessons: newLessons };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  const addCourse = useCallback(
    async (data: Omit<Course, "id" | "createdAt">) => {
      const id = generateId();
      const course: Course = {
        ...data,
        id,
        createdAt: new Date().toISOString(),
      };

      const courseLessons: Lesson[] = Array.from(
        { length: data.totalLessons },
        (_, i) => ({
          courseId: id,
          lessonNumber: i + 1,
          completed: false,
          completedAt: null,
        })
      );

      const newCourses = [...courses, course];
      const newLessons = { ...lessons, [id]: courseLessons };

      setCourses(newCourses);
      setLessons(newLessons);
      await saveData(newCourses, newLessons);
    },
    [courses, lessons]
  );

  const updateCourse = useCallback(
    async (id: string, data: Omit<Course, "id" | "createdAt">) => {
      const existing = courses.find((c) => c.id === id);
      if (!existing) return;

      const updated: Course = {
        ...existing,
        ...data,
      };

      let updatedLessons = lessons[id] ?? [];
      const oldTotal = existing.totalLessons;
      const newTotal = data.totalLessons;

      if (newTotal > oldTotal) {
        const extra: Lesson[] = Array.from(
          { length: newTotal - oldTotal },
          (_, i) => ({
            courseId: id,
            lessonNumber: oldTotal + i + 1,
            completed: false,
            completedAt: null,
          })
        );
        updatedLessons = [...updatedLessons, ...extra];
      } else if (newTotal < oldTotal) {
        updatedLessons = updatedLessons.filter(
          (l) => l.lessonNumber <= newTotal
        );
      }

      const newCourses = courses.map((c) => (c.id === id ? updated : c));
      const newLessons = { ...lessons, [id]: updatedLessons };

      setCourses(newCourses);
      setLessons(newLessons);
      await saveData(newCourses, newLessons);
    },
    [courses, lessons]
  );

  const deleteCourse = useCallback(
    async (id: string) => {
      const newCourses = courses.filter((c) => c.id !== id);
      const newLessons = { ...lessons };
      delete newLessons[id];

      setCourses(newCourses);
      setLessons(newLessons);
      await saveData(newCourses, newLessons);
    },
    [courses, lessons]
  );

  const toggleLesson = useCallback(
    async (courseId: string, lessonNumber: number) => {
      const courseLessons = lessons[courseId] ?? [];
      const updated = courseLessons.map((l) => {
        if (l.lessonNumber !== lessonNumber) return l;
        const completed = !l.completed;
        return {
          ...l,
          completed,
          completedAt: completed ? new Date().toISOString() : null,
        };
      });

      const newLessons = { ...lessons, [courseId]: updated };
      setLessons(newLessons);
      await saveData(courses, newLessons);
    },
    [courses, lessons]
  );

  const exportData = useCallback((): string => {
    const data: CoursesData = { courses, lessons };
    return JSON.stringify(data, null, 2);
  }, [courses, lessons]);

  const importData = useCallback(
    async (json: string): Promise<boolean> => {
      try {
        const data: CoursesData = JSON.parse(json);
        if (!Array.isArray(data.courses) || typeof data.lessons !== "object") {
          return false;
        }
        setCourses(data.courses);
        setLessons(data.lessons);
        await saveData(data.courses, data.lessons);
        return true;
      } catch (e) {
        return false;
      }
    },
    []
  );

  const getCourseLessons = useCallback(
    (courseId: string): Lesson[] => {
      return lessons[courseId] ?? [];
    },
    [lessons]
  );

  const getCompletedCount = useCallback(
    (courseId: string): number => {
      return (lessons[courseId] ?? []).filter((l) => l.completed).length;
    },
    [lessons]
  );

  const getRemainingText = useCallback(
    (courseId: string): string => {
      return formatRemainingLessons(lessons[courseId] ?? []);
    },
    [lessons]
  );

  return (
    <CoursesContext.Provider
      value={{
        courses,
        lessons,
        addCourse,
        updateCourse,
        deleteCourse,
        toggleLesson,
        exportData,
        importData,
        getCourseLessons,
        getCompletedCount,
        getRemainingText,
      }}
    >
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses(): CoursesContextType {
  const ctx = useContext(CoursesContext);
  if (!ctx) throw new Error("useCourses must be used within CoursesProvider");
  return ctx;
}
