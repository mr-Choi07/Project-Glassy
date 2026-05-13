import { Tabs } from "expo-router";
import { BookOpen, Home, Map, MessageCircle, User } from "lucide-react-native";
import React from "react";
import { View } from "react-native";
import { useTheme } from "@/context/ThemeContext";

// 5탭: 홈 | 스팟 | AI(중앙) | 기록 | 마이
export default function TabLayout() {
  const { colors: C, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.textSubtle,
        tabBarStyle: {
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: C.border,
          backgroundColor: C.bgCard,
          position: "absolute",
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "스팟",
          tabBarIcon: ({ color, focused }) => (
            <Map size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      {/* Center floating AI button */}
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: "",
          tabBarIcon: ({ focused }) => (
            <View style={{
              width: 58, height: 58, borderRadius: 29,
              backgroundColor: focused ? C.primary : (isDark ? "#1A2E45" : "#E0F2FE"),
              justifyContent: "center", alignItems: "center",
              top: -14, borderWidth: 1.5,
              borderColor: focused ? C.primary : C.border,
              shadowColor: C.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: focused ? 0.5 : 0.3,
              shadowRadius: 8, elevation: 8,
            }}>
              <MessageCircle size={26} color={focused ? "#fff" : C.primary} strokeWidth={2} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="log"
        options={{
          title: "기록",
          tabBarIcon: ({ color, focused }) => (
            <BookOpen size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />

      <Tabs.Screen
        name="mypage"
        options={{
          title: "마이",
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}
