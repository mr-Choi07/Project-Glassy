import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";

const weightToFont: Record<string, string> = {
  "100":   "Paperlogy-Thin",
  "200":   "Paperlogy-Thin",
  "300":   "Paperlogy-Regular",
  "400":   "Paperlogy-Regular",
  normal:  "Paperlogy-Regular",
  "500":   "Paperlogy-Medium",
  "600":   "Paperlogy-SemiBold",
  "700":   "Paperlogy-Bold",
  bold:    "Paperlogy-Bold",
  "800":   "Paperlogy-Black",
  "900":   "Paperlogy-Black",
};

export function GlassyText({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const weight = String(flat.fontWeight ?? "400");
  const fontFamily = flat.fontFamily ?? weightToFont[weight] ?? "Paperlogy-Regular";

  return (
    <Text
      {...props}
      style={[{ fontFamily, fontWeight: undefined }, style, { fontFamily }]}
    />
  );
}
