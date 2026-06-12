import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COURSE_TYPE_LABELS,
  useCourses,
} from "@/context/CoursesContext";
import { useColors } from "@/hooks/useColors";

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { courses, toggleLesson, getCourseLessons, getCompletedCount, deleteCourse } =
    useCourses();

  const course = courses.find((c) => c.id === id);
  const lessons = getCourseLessons(id ?? "");
  const completedCount = getCompletedCount(id ?? "");

  const sortedLessons = useMemo(
    () => [...lessons].sort((a, b) => a.lessonNumber - b.lessonNumber),
    [lessons]
  );

  useEffect(() => {
    if (course) {
      navigation.setOptions({ title: course.courseName });
    }
  }, [course, navigation]);

  if (!course) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          找不到課程
        </Text>
      </View>
    );
  }

  const progress = course.totalLessons > 0 ? completedCount / course.totalLessons : 0;

  async function handleToggle(lessonNumber: number) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleLesson(id!, lessonNumber);
  }

  function handleDelete() {
    Alert.alert("刪除課程", `確定要刪除「${course!.courseName}」嗎？`, [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          await deleteCourse(id!);
          router.back();
        },
      },
    ]);
  }

  const bottomPad =
    Platform.OS === "web" ? 34 + 84 + 16 : insets.bottom + 84 + 16;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <FlatList
        data={sortedLessons}
        keyExtractor={(item) => item.lessonNumber.toString()}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: bottomPad,
          paddingTop: 8,
        }}
        ListHeaderComponent={
          <CourseHeader
            course={course}
            completedCount={completedCount}
            progress={progress}
            onDelete={handleDelete}
            onEdit={() => router.push(`/edit-course/${id}`)}
            colors={colors}
          />
        }
        renderItem={({ item }) => (
          <LessonRow
            lessonNumber={item.lessonNumber}
            completed={item.completed}
            completedAt={item.completedAt}
            onToggle={() => handleToggle(item.lessonNumber)}
            colors={colors}
          />
        )}
      />
    </View>
  );
}

function CourseHeader({
  course,
  completedCount,
  progress,
  onDelete,
  onEdit,
  colors,
}: {
  course: { courseName: string; gradeName: string; courseType: any; totalLessons: number; notes: string };
  completedCount: number;
  progress: number;
  onDelete: () => void;
  onEdit: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const isAllDone = completedCount === course.totalLessons && course.totalLessons > 0;

  return (
    <View>
      <View style={[headerStyles.infoCard, { backgroundColor: colors.card, borderRadius: colors.radius as number }]}>
        <View style={headerStyles.infoRow}>
          <View style={headerStyles.infoItem}>
            <Text style={[headerStyles.infoLabel, { color: colors.mutedForeground }]}>年級</Text>
            <Text style={[headerStyles.infoValue, { color: colors.foreground }]}>
              {course.gradeName || "—"}
            </Text>
          </View>
          <View style={headerStyles.infoItem}>
            <Text style={[headerStyles.infoLabel, { color: colors.mutedForeground }]}>類型</Text>
            <Text style={[headerStyles.infoValue, { color: colors.foreground }]}>
              {COURSE_TYPE_LABELS[course.courseType]}
            </Text>
          </View>
          <View style={headerStyles.infoItem}>
            <Text style={[headerStyles.infoLabel, { color: colors.mutedForeground }]}>總課數</Text>
            <Text style={[headerStyles.infoValue, { color: colors.foreground }]}>
              {course.totalLessons}
            </Text>
          </View>
        </View>

        <View style={[headerStyles.divider, { backgroundColor: colors.border }]} />

        <View style={headerStyles.progressSection}>
          <View style={headerStyles.progressTextRow}>
            <Text style={[headerStyles.progressLabel, { color: colors.foreground }]}>完成進度</Text>
            <Text style={[headerStyles.progressCount, { color: isAllDone ? colors.accent : colors.primary }]}>
              {completedCount}/{course.totalLessons}
            </Text>
          </View>
          <View style={[headerStyles.progressBg, { backgroundColor: colors.muted }]}>
            <View
              style={[
                headerStyles.progressFill,
                {
                  width: `${Math.round(progress * 100)}%` as any,
                  backgroundColor: isAllDone ? colors.accent : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {course.notes ? (
          <>
            <View style={[headerStyles.divider, { backgroundColor: colors.border }]} />
            <Text style={[headerStyles.notes, { color: colors.mutedForeground }]}>
              {course.notes}
            </Text>
          </>
        ) : null}
      </View>

      <View style={headerStyles.actionsRow}>
        <TouchableOpacity
          style={[headerStyles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={onEdit}
        >
          <Feather name="edit-2" size={15} color={colors.primary} />
          <Text style={[headerStyles.actionBtnText, { color: colors.primary }]}>編輯課程</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[headerStyles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={onDelete}
        >
          <Feather name="trash-2" size={15} color={colors.destructive} />
          <Text style={[headerStyles.actionBtnText, { color: colors.destructive }]}>刪除課程</Text>
        </TouchableOpacity>
      </View>

      <Text style={[headerStyles.sectionLabel, { color: colors.mutedForeground }]}>課次列表</Text>
    </View>
  );
}

function LessonRow({
  lessonNumber,
  completed,
  completedAt,
  onToggle,
  colors,
}: {
  lessonNumber: number;
  completed: boolean;
  completedAt: string | null;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  return (
    <Pressable
      style={({ pressed }) => [
        lessonStyles.row,
        {
          backgroundColor: completed ? "#EAFAF3" : colors.card,
          borderColor: completed ? "#B2EDCF" : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onToggle}
    >
      <View
        style={[
          lessonStyles.checkbox,
          {
            backgroundColor: completed ? colors.accent : "transparent",
            borderColor: completed ? colors.accent : colors.border,
          },
        ]}
      >
        {completed && <Feather name="check" size={14} color="#fff" />}
      </View>
      <View style={lessonStyles.lessonInfo}>
        <Text
          style={[
            lessonStyles.lessonLabel,
            {
              color: completed ? colors.accent : colors.foreground,
              fontFamily: completed ? "Inter_600SemiBold" : "Inter_500Medium",
            },
          ]}
        >
          L{lessonNumber}
        </Text>
        {dateStr && (
          <Text style={[lessonStyles.dateText, { color: colors.mutedForeground }]}>
            {dateStr}
          </Text>
        )}
      </View>
      <Text style={[lessonStyles.statusText, { color: completed ? colors.accent : colors.mutedForeground }]}>
        {completed ? "已完成" : "未完成"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});

const headerStyles = StyleSheet.create({
  infoCard: {
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 14 },
  infoItem: { alignItems: "center", flex: 1 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginBottom: 14 },
  progressSection: {},
  progressTextRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  progressCount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  notes: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actionsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
});

const lessonStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  lessonInfo: { flex: 1, gap: 2 },
  lessonLabel: { fontSize: 15 },
  dateText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusText: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 0 },
});
