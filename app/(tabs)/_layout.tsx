import { Tabs } from "expo-router";
import { BookOpen, Home, Map, MessageCircle, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "@/constants/theme";

// 5탭: 홈 | 스팟 | AI(중앙) | 기록 | 마이
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSubtle,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
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
            <View style={[styles.aiBtn, focused && styles.aiBtnActive]}>
              <MessageCircle size={26} color="#fff" strokeWidth={2} />
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

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    paddingBottom: 24,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bgCard,
    position: "absolute",
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  aiBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#1A2E45",
    justifyContent: "center",
    alignItems: "center",
    top: -14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowOpacity: 0.5,
  },
});
