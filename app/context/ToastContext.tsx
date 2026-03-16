import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, Platform, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ToastOptions {
  title: string;
  message: string;
  icon?: ReactNode;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const showToast = (options: ToastOptions) => {
    setToast(options);
    
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();

    // Hide after duration
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setToast(null);
      });
    }, options.duration || 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View style={[styles.toastWrapper, { paddingTop: insets.top + (Platform.OS === 'android' ? 10 : 0) }]} pointerEvents="none">
          <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity }]}>
            <View style={styles.iconContainer}>
              {toast.icon ? toast.icon : <Ionicons name="information-circle" size={24} color="#FFD700" />}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{toast.title}</Text>
              {!!toast.message && <Text style={styles.message}>{toast.message}</Text>}
            </View>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toastWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    maxWidth: 400,
    width: '90%',
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0a0a1a',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  message: {
    color: '#fff',
    fontSize: 13,
    marginTop: 2,
  },
});
