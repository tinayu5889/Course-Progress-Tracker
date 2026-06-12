import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCourses } from "@/context/CoursesContext";
import { useColors } from "@/hooks/useColors";

export default function ImportDataScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { importData } = useCourses();

  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    if (!jsonText.trim()) return;

    Alert.alert(
      "匯入資料",
      "匯入會覆蓋現有的所有課程資料，確定繼續嗎？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "確定匯入",
          style: "destructive",
          onPress: async () => {
            setImporting(true);
            const ok = await importData(jsonText.trim());
            setImporting(false);
            if (ok) {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              router.back();
            } else {
              Alert.alert("匯入失敗", "JSON 格式不正確，請確認資料格式後再試。");
            }
          },
        },
      ]
    );
  }

  const canImport = jsonText.trim().length > 0;

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.infoBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            將先前匯出的 JSON 備份資料貼到下方文字框，然後點擊「匯入」。
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          貼上備份資料
        </Text>
        <TextInput
          value={jsonText}
          onChangeText={setJsonText}
          placeholder='{"courses": [...], "lessons": {...}}'
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.textArea,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          multiline
          textAlignVertical="top"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

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
            styles.importBtn,
            { backgroundColor: canImport ? colors.primary : colors.muted },
          ]}
          onPress={handleImport}
          disabled={!canImport || importing}
          activeOpacity={0.85}
        >
          <Feather
            name="download"
            size={18}
            color={canImport ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text
            style={[
              styles.importBtnText,
              {
                color: canImport ? colors.primaryForeground : colors.mutedForeground,
              },
            ]}
          >
            {importing ? "匯入中..." : "匯入資料"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textArea: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  importBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
