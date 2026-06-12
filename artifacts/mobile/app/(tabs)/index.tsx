import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COURSE_TYPE_LABELS,
  COURSE_TYPES,
  CourseType,
  useCourses,
} from "@/context/CoursesContext";
import { useColors } from "@/hooks/useColors";

type StatusFilter = "all" | "completed" | "inprogress";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "全部",
  completed: "已完成",
  inprogress: "進行中",
};

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    courses,
    exportData,
    getCompletedCount,
    getRemainingText,
    deleteCourse,
  } = useCourses();

  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const uniqueGrades = useMemo(() => {
    const grades = courses.map((c) => c.gradeName).filter(Boolean);
    return Array.from(new Set(grades)).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (gradeFilter !== "all" && c.gradeName !== gradeFilter) return false;
      if (typeFilter !== "all" && c.courseType !== typeFilter) return false;
      if (statusFilter !== "all") {
        const done = getCompletedCount(c.id);
        const isCompleted = done === c.totalLessons && c.totalLessons > 0;
        if (statusFilter === "completed" && !isCompleted) return false;
        if (statusFilter === "inprogress" && isCompleted) return false;
      }
      return true;
    });
  }, [courses, gradeFilter, typeFilter, statusFilter, getCompletedCount]);

  async function handleExport() {
    const json = exportData();
    await Share.share({
      message: json,
      title: "課程使用紀錄備份",
    });
  }

  function handleDeleteCourse(id: string, name: string) {
    Alert.alert("刪除課程", `確定要刪除「${name}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning
          );
          await deleteCourse(id);
        },
      },
    ]);
  }

  const styles = makeStyles(colors);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 84;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={styles.headerTitle}>我的課程</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push("/import-data")}
          >
            <Feather name="download" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleExport}>
            <Feather name="upload" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <FilterRow
          label="年級"
          value={gradeFilter}
          options={[
            { value: "all", label: "全部年級" },
            ...uniqueGrades.map((g) => ({ value: g, label: g })),
          ]}
          onChange={setGradeFilter}
          colors={colors}
        />
        <FilterRow
          label="類型"
          value={typeFilter}
          options={[
            { value: "all", label: "全部類型" },
            ...COURSE_TYPES.map((t) => ({
              value: t,
              label: COURSE_TYPE_LABELS[t],
            })),
          ]}
          onChange={setTypeFilter}
          colors={colors}
        />
        <View style={styles.statusRow}>
          {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusChip,
                statusFilter === s && {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                },
              ]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === s && { color: colors.primaryForeground },
                ]}
              >
                {STATUS_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomPad, paddingTop: 8 }}
        renderItem={({ item }) => {
          const completed = getCompletedCount(item.id);
          const remaining = getRemainingText(item.id);
          const isAllDone = completed === item.totalLessons && item.totalLessons > 0;
          return (
            <CourseCard
              name={item.courseName}
              grade={item.gradeName}
              type={item.courseType}
              completed={completed}
              total={item.totalLessons}
              remaining={remaining}
              isAllDone={isAllDone}
              onPress={() => router.push(`/course/${item.id}`)}
              onLongPress={() => handleDeleteCourse(item.id, item.courseName)}
              colors={colors}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="book-open" size={52} color={colors.border} />
            <Text style={styles.emptyTitle}>
              {courses.length === 0 ? "還沒有課程" : "沒有符合的課程"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {courses.length === 0
                ? "點右下角的 + 新增第一門課"
                : "試試調整篩選條件"}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 84 + 16,
          },
        ]}
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/add-course");
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function FilterRow({
  value,
  options,
  onChange,
  colors,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const styles = makeStyles(colors);
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={options}
      keyExtractor={(o) => o.value}
      style={{ marginBottom: 6 }}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.filterChip,
            value === item.value && {
              backgroundColor: colors.secondary,
              borderColor: colors.primary,
            },
          ]}
          onPress={() => onChange(item.value)}
        >
          <Text
            style={[
              styles.filterChipText,
              value === item.value && { color: colors.primary, fontFamily: "Inter_600SemiBold" },
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

function CourseCard({
  name,
  grade,
  type,
  completed,
  total,
  remaining,
  isAllDone,
  onPress,
  onLongPress,
  colors,
}: {
  name: string;
  grade: string;
  type: CourseType;
  completed: number;
  total: number;
  remaining: string;
  isAllDone: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const styles = makeStyles(colors);
  const progress = total > 0 ? completed / total : 0;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.9 : 1 }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.courseName} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.cardBadges}>
          {grade ? (
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeBadgeText}>{grade}</Text>
            </View>
          ) : null}
          <View style={[styles.typeBadge, isAllDone && styles.doneBadge]}>
            <Text style={[styles.typeBadgeText, isAllDone && styles.doneBadgeText]}>
              {isAllDone ? "已完成" : COURSE_TYPE_LABELS[type]}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(progress * 100)}%` as any,
                backgroundColor: isAllDone ? colors.accent : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completed}/{total}
        </Text>
      </View>

      {!isAllDone && total > 0 ? (
        <Text style={styles.remainingText} numberOfLines={1}>
          剩下：{remaining}
        </Text>
      ) : isAllDone ? (
        <Text style={[styles.remainingText, { color: colors.accent }]}>
          全部完成
        </Text>
      ) : null}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    headerActions: { flexDirection: "row", gap: 4 },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
    },
    filtersContainer: { paddingTop: 4, paddingBottom: 4 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    statusRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginTop: 2,
    },
    statusChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    statusChipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    cardTitleRow: { flex: 1, marginRight: 8 },
    courseName: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 22,
    },
    cardBadges: { flexDirection: "row", gap: 6, flexShrink: 0 },
    gradeBadge: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    gradeBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    typeBadge: {
      backgroundColor: colors.secondary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    typeBadgeText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.primary,
    },
    doneBadge: { backgroundColor: "#EAFAF3" },
    doneBadgeText: { color: colors.accent },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 6,
    },
    progressBarBg: {
      flex: 1,
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      borderRadius: 3,
    },
    progressText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      minWidth: 36,
      textAlign: "right",
    },
    remainingText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    emptyContainer: {
      alignItems: "center",
      paddingTop: 80,
      paddingHorizontal: 32,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Inter_600SemiBold",
      color: colors.mutedForeground,
    },
    emptySubtitle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      textAlign: "center",
    },
    fab: {
      position: "absolute",
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 6,
    },
  });
}
