import { Tabs } from "expo-router";
import { Home, Map, MessageCircle } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          height: 85,
          paddingBottom: 25,
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          position: "absolute", // 살짝 떠 있는 효과
          backgroundColor: "#fff",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />

      {/* 🚀 강조된 AI 챗봇 탭 */}
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: "", // 텍스트 생략하여 아이콘 강조
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.aiButtonContainer,
                focused && styles.aiButtonActive,
              ]}
            >
              <MessageCircle
                size={32}
                color="#fff"
                fill={focused ? "#fff" : "transparent"}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="map" // 파일이 없다면 추후 생성 필요
        options={{
          title: "스팟맵",
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  aiButtonContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#212529", // 어두운 톤으로 강조
    justifyContent: "center",
    alignItems: "center",
    top: -15, // 위로 툭 튀어나오게 설정
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  aiButtonActive: {
    backgroundColor: "#007AFF", // 활성화 시 파란색으로 변함
  },
});
