import React, { createContext, useContext, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertConfig {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  icon?: React.ReactNode;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  function showAlert(cfg: AlertConfig) {
    setConfig(cfg);
  }

  function dismiss() {
    setConfig(null);
  }

  const buttons: AlertButton[] = config?.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={!!config}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            {config?.icon && <View style={styles.iconRow}>{config.icon}</View>}
            <Text style={styles.title}>{config?.title ?? ''}</Text>
            {!!config?.message && (
              <Text style={styles.message}>{config.message}</Text>
            )}
            <View style={[styles.buttonRow, buttons.length === 1 && styles.buttonRowSingle]}>
              {buttons.map((btn, i) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      buttons.length === 1 && styles.buttonFull,
                      isCancel && styles.buttonCancel,
                      isDestructive && styles.buttonDestructive,
                      !isCancel && !isDestructive && styles.buttonPrimary,
                    ]}
                    onPress={() => {
                      dismiss();
                      btn.onPress?.();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCancel && styles.buttonTextCancel,
                        isDestructive && styles.buttonTextDestructive,
                        !isCancel && !isDestructive && styles.buttonTextPrimary,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlert must be used within AlertProvider');
  return ctx;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#0e0e1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  iconRow: {
    marginBottom: 12,
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  buttonRowSingle: {
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonFull: {
    flex: 0,
    paddingHorizontal: 40,
  },
  buttonPrimary: {
    backgroundColor: '#FFD700',
  },
  buttonCancel: {
    backgroundColor: '#1e1e35',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  buttonDestructive: {
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonTextPrimary: {
    color: '#0a0a1a',
  },
  buttonTextCancel: {
    color: '#aaa',
  },
  buttonTextDestructive: {
    color: '#ff6666',
  },
});
