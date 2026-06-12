import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function EditCourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { courses, updateCourse } = useCourses();

  const course = courses.find((c) => c.id === id);

  const [gradeName, setGradeName] = useState(course?.gradeName ?? "");
  const [courseName, setCourseName] = useState(course?.courseName ?? "");
  const [courseType, setCourseType] = useState<CourseType>(
    course?.courseType ?? "online"
  );
  const [totalLessons, setTotalLessons] = useState(
    course?.totalLessons?.toString() ?? ""
  );
  const [notes, setNotes] = useState(course?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "編輯課程" });
  }, [navigation]);

  if (!course) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
          找不到課程
        </Text>
      </View>
    );
  }

  const canSave = courseName.trim().length > 0 && parseInt(totalLessons, 10) > 0;

  async function handleSave() {
    if (!canSave) return;
    const total = parseInt(totalLessons, 10);
    setSaving(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateCourse(id!, {
      gradeName: gradeName.trim(),
      courseName: courseName.trim(),
      courseType,
      totalLessons: total,
      notes: notes.trim(),
    });
    setSaving(false);
    router.back();
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Platform.OS === "web" ? 34 + 16 : insets.bottom + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <FieldGroup label="課程名稱 *" colors={colors}>
          <StyledInput
            value={courseName}
            onChangeText={setCourseName}
            placeholder="輸入課程名稱"
            colors={colors}
          />
        </FieldGroup>

        <FieldGroup label="適合年級" colors={colors}>
          <StyledInput
            value={gradeName}
            onChangeText={setGradeName}
            placeholder="例如：一年級、3-5年級"
            colors={colors}
          />
        </FieldGroup>

        <FieldGroup label="課程類型" colors={colors}>
          <View style={styles.typeGrid}>
            {COURSE_TYPES.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor:
                      courseType === t ? colors.primary : colors.card,
                    borderColor:
                      courseType === t ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCourseType(t)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    {
                      color:
                        courseType === t
                          ? colors.primaryForeground
                          : colors.foreground,
                    },
                  ]}
                >
                  {COURSE_TYPE_LABELS[t]}
                </Text>
              </Pressable>
            ))}
          </View>
        </FieldGroup>

        <FieldGroup label="總課數 *" colors={colors}>
          <StyledInput
            value={totalLessons}
            onChangeText={(t) => setTotalLessons(t.replace(/[^0-9]/g, ""))}
            placeholder="輸入總課數（數字）"
            colors={colors}
            keyboardType="numeric"
          />
        </FieldGroup>

        <FieldGroup label="備註" colors={colors}>
          <StyledInput
            value={notes}
            onChangeText={setNotes}
            placeholder="選填備註..."
            colors={colors}
            multiline
            numberOfLines={3}
          />
        </FieldGroup>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Platform.OS === "web" ? 34 + 16 : insets.bottom + 16,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: canSave ? colors.primary : colors.muted },
          ]}
          onPress={handleSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
        >
          <Feather
            name="check"
            size={18}
            color={canSave ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.saveBtnText,
              {
                color: canSave ? colors.primaryForeground : colors.mutedForeground,
              },
            ]}
          >
            {saving ? "儲存中..." : "儲存變更"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FieldGroup({
  label,
  children,
  colors,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  colors,
  multiline,
  numberOfLines,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.mutedForeground}
      style={[
        styles.input,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          color: colors.foreground,
          minHeight: multiline ? 80 : 48,
          textAlignVertical: multiline ? "top" : "center",
        },
      ]}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType ?? "default"}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 4 },
  fieldGroup: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
