/**
 * NAVEGACAO - alternancia explicita entre MODO CONSTRUCAO e MODO LAUDO.
 * Tabs inferiores com alvos de 64dp (operacao com luva) e rotulos em caixa alta.
 */
import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';

import HomeScreen from '../screens/HomeScreen';
import ExplorerScreen from '../screens/ExplorerScreen';
import AuditScreen from '../screens/AuditScreen';
import ReportSetupScreen from '../screens/ReportSetupScreen';
import ExportScreen from '../screens/ExportScreen';
import { colors, type } from '../theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.bgDeep,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

function TabIcon({ label, focused }) {
  return (
    <View style={[styles.icon, focused && styles.iconOn]}>
      <Text style={[styles.iconTxt, focused && styles.iconTxtOn]}>{label}</Text>
    </View>
  );
}

/** Modo Laudo = stack (cabecalho -> geracao) */
function LaudoStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Cabecalho" component={ReportSetupScreen} />
      <Stack.Screen name="Gerar" component={ExportScreen} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgDeep,
            borderTopWidth: 2.5,
            borderTopColor: colors.primary,
            height: Platform.OS === 'ios' ? 92 : 74,
            paddingTop: 8,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarLabelStyle: { ...type.label, fontSize: 10.5 },
          tabBarItemStyle: { minHeight: 60 },
        }}
      >
        <Tab.Screen name="Projeto" component={HomeScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="PRJ" focused={focused} /> }} />
        <Tab.Screen name="Construcao" component={ExplorerScreen}
          options={{ tabBarLabel: 'CONSTRUCAO', tabBarIcon: ({ focused }) => <TabIcon label="ARV" focused={focused} /> }} />
        <Tab.Screen name="Conformidade" component={AuditScreen}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="NBR" focused={focused} /> }} />
        <Tab.Screen name="Laudo" component={LaudoStack}
          options={{ tabBarIcon: ({ focused }) => <TabIcon label="DOC" focused={focused} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  icon: {
    minWidth: 42, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5,
    borderWidth: 1.4, borderColor: colors.textDim, alignItems: 'center',
  },
  iconOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  iconTxt: { ...type.label, fontSize: 9.5, color: colors.textDim },
  iconTxtOn: { color: colors.primary },
});
