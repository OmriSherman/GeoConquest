import React, { createContext, useContext, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'cta';
}

export interface AlertConfig {
  title: string;
  titleNode?: React.ReactNode;
  message?: string;
  contentNode?: React.ReactNode;
  buttons?: AlertButton[];
  icon?: React.ReactNode;
  messageAlign?: 'left' | 'center';
  variant?: 'default' | 'premium' | 'leveled' | 'unique' | 'ticket';
  confetti?: boolean;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
  /** Not enough gold — shows item preview + Buy Gold / Cancel */
  showNotEnoughGoldAlert: (opts: {
    itemNode?: React.ReactNode;
    itemName?: string;
    onBuyGold: () => void;
  }) => void;
  /** Conqueror's Pass paywall — Conqueror icon + Upgrade / Got it */
  showPremiumAlert: (opts?: {
    itemNode?: React.ReactNode;
    itemName?: string;
    onUpgrade?: () => void;
  }) => void;
  /** Level requirement — blue palette, explains needed level */
  showLevelAlert: (opts: {
    requiredLevel: number;
    itemNode?: React.ReactNode;
    itemName?: string;
  }) => void;
  /** Unique/quest requirement — teal palette, explains what's needed */
  showUniqueAlert: (opts: {
    itemNode?: React.ReactNode;
    itemName?: string;
    requirement: string;
  }) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AlertContext = createContext<AlertContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [fireConfetti, setFireConfetti] = useState(false);

  function showAlert(cfg: AlertConfig) {
    setConfig(cfg);
  }

  function dismiss() {
    setConfig(null);
  }

  function showNotEnoughGoldAlert({
    itemNode,
    itemName,
    onBuyGold,
  }: {
    itemNode?: React.ReactNode;
    itemName?: string;
    onBuyGold: () => void;
  }) {
    setConfig({
      variant: 'default',
      title: 'Not Enough Gold',
      icon: itemNode,
      message: `You don't have enough gold to purchase${itemName ? ` ${itemName}` : ' this item'}.`,
      buttons: [
        { text: 'Buy Gold', style: 'cta', onPress: onBuyGold },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  }

  function showPremiumAlert({
    itemNode,
    itemName,
    onUpgrade,
  }: {
    itemNode?: React.ReactNode;
    itemName?: string;
    onUpgrade?: () => void;
  } = {}) {
    setConfig({
      variant: 'premium',
      title: "Conqueror's Pass",
      icon: itemNode ?? (
        <Image
          source={require('../../assets/avatars/conqueror.png')}
          style={{ width: 128, height: 128, borderRadius: 10 }}
          resizeMode="contain"
        />
      ),
      message: itemName
        ? `${itemName} is exclusive to Conqueror's Pass members.\nUpgrade to unlock all premium content.`
        : "This item is exclusive to Conqueror's Pass members.\nUpgrade to unlock all premium content.",
      buttons: [
        { text: 'Upgrade', style: 'cta', onPress: onUpgrade },
        { text: 'Got it', style: 'cancel' },
      ],
    });
  }

  function showLevelAlert({
    requiredLevel,
    itemNode,
    itemName,
  }: {
    requiredLevel: number;
    itemNode?: React.ReactNode;
    itemName?: string;
  }) {
    setConfig({
      variant: 'leveled',
      title: `Level ${requiredLevel} Required`,
      icon: itemNode,
      message: `Reach Level ${requiredLevel} to unlock${itemName ? ` ${itemName}` : ' this item'}.`,
      buttons: [{ text: 'OK', style: 'default' }],
    });
  }

  function showUniqueAlert({
    itemNode,
    itemName,
    requirement,
  }: {
    itemNode?: React.ReactNode;
    itemName?: string;
    requirement: string;
  }) {
    setConfig({
      variant: 'unique',
      title: itemName ? `Unlock ${itemName}` : 'Special Requirement',
      icon: itemNode,
      message: requirement,
      buttons: [{ text: 'Got it', style: 'default' }],
    });
  }

  const buttons: AlertButton[] = config?.buttons?.length
    ? config.buttons
    : [{ text: 'OK', style: 'default' }];

  const hasCta = buttons.some(b => b.style === 'cta');

  const isPremium = config?.variant === 'premium';
  const isLeveled = config?.variant === 'leveled';
  const isUnique = config?.variant === 'unique';
  const isTicket = config?.variant === 'ticket';

  const ctaGlowColor = isPremium
    ? '#7B2FBE'
    : isLeveled
    ? '#4a9eff'
    : isUnique
    ? '#2ae8c8'
    : isTicket
    ? '#e05353'
    : '#FFD700';

  return (
    <AlertContext.Provider
      value={{
        showAlert,
        showNotEnoughGoldAlert,
        showPremiumAlert,
        showLevelAlert,
        showUniqueAlert,
      }}
    >
      {children}
      <Modal
        visible={!!config}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <View style={styles.overlay}>
          <View
            style={[
              styles.card,
              isPremium && styles.cardPremium,
              isLeveled && styles.cardLeveled,
              isUnique && styles.cardUnique,
              isTicket && styles.cardTicket,
            ]}
          >
            {config?.icon && (
              <View style={styles.iconRow}>{config.icon}</View>
            )}
            {config?.titleNode ? (
              <View style={styles.titleNodeWrap}>{config.titleNode}</View>
            ) : (
              <Text
                style={[
                  styles.title,
                  isPremium && styles.titlePremium,
                  isLeveled && styles.titleLeveled,
                  isUnique && styles.titleUnique,
                  isTicket && styles.titleTicket,
                ]}
              >
                {config?.title ?? ''}
              </Text>
            )}
            {!!config?.contentNode && (
              <View style={styles.contentNodeWrap}>{config.contentNode}</View>
            )}
            {!!config?.message && (
              <Text
                style={[
                  styles.message,
                  config.messageAlign === 'left' && styles.messageLeft,
                ]}
              >
                {config.message}
              </Text>
            )}
            <View
              style={[
                hasCta ? styles.buttonRowStacked : styles.buttonRow,
                !hasCta && buttons.length === 1 && styles.buttonRowSingle,
              ]}
            >
              {buttons.map((btn, i) => {
                const isCta = btn.style === 'cta';
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                const isPrimary = !isCancel && !isDestructive;
                // In stacked (CTA) layout, render cancel as ghost text link
                if (hasCta && isCancel) {
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.buttonGhostCancel}
                      onPress={() => { dismiss(); btn.onPress?.(); }}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.buttonGhostCancelText}>{btn.text}</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.button,
                      !hasCta && buttons.length === 1 && styles.buttonFull,
                      isCancel && styles.buttonCancel,
                      isDestructive && styles.buttonDestructive,
                      isPrimary && styles.buttonPrimary,
                      isPrimary && isPremium && styles.buttonPremium,
                      isPrimary && isLeveled && styles.buttonLeveled,
                      isPrimary && isUnique && styles.buttonUnique,
                      isPrimary && isTicket && styles.buttonTicket,
                      isCta && styles.buttonCta,
                      isCta && {
                        shadowColor: ctaGlowColor,
                        shadowOpacity: 0.55,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 8,
                      },
                    ]}
                    onPress={() => {
                      if (config?.confetti) setFireConfetti(true);
                      dismiss();
                      btn.onPress?.();
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isCta && styles.buttonTextCta,
                        isCancel && styles.buttonTextCancel,
                        isDestructive && styles.buttonTextDestructive,
                        isPrimary && styles.buttonTextPrimary,
                        isPrimary && isPremium && styles.buttonTextPremium,
                        isPrimary && isLeveled && styles.buttonTextLeveled,
                        isPrimary && isUnique && styles.buttonTextUnique,
                        isPrimary && isTicket && styles.buttonTextTicket,
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
      {fireConfetti && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ConfettiCannon
            count={120}
            origin={{ x: SCREEN_W / 2, y: SCREEN_H * 0.72 }}
            explosionSpeed={400}
            fallSpeed={2800}
            fadeOut
            colors={['#FFD700', '#FFA500', '#ff4dff', '#4daaff', '#ffffff', '#ff4d4d']}
            onAnimationEnd={() => setFireConfetti(false)}
          />
        </View>
      )}
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
  cardPremium: {
    backgroundColor: '#120820',
    borderColor: '#7B2FBE',
    shadowColor: '#7B2FBE',
    shadowOpacity: 0.3,
  },
  cardLeveled: {
    backgroundColor: '#0d1b2a',
    borderColor: '#4a9eff',
    shadowColor: '#4a9eff',
    shadowOpacity: 0.35,
  },
  cardUnique: {
    backgroundColor: '#0a1c1a',
    borderColor: '#1a4a44',
    shadowColor: '#2ae8c8',
    shadowOpacity: 0.25,
  },
  cardTicket: {
    backgroundColor: '#1e0808',
    borderColor: '#e05353',
    shadowColor: '#e05353',
    shadowOpacity: 0.3,
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
  titlePremium: {
    color: '#9B59B6',
  },
  titleLeveled: {
    color: '#4a9eff',
  },
  titleUnique: {
    color: '#2ae8c8',
  },
  titleTicket: {
    color: '#e05353',
  },
  titleNodeWrap: {
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  message: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  messageLeft: {
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  contentNodeWrap: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    width: '100%',
  },
  buttonRowStacked: {
    flexDirection: 'column',
    gap: 0,
    marginTop: 8,
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
  buttonCta: {
    flex: 0,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonFull: {
    flex: 0,
    paddingHorizontal: 40,
  },
  buttonGhostCancel: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonGhostCancelText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonPrimary: {
    backgroundColor: '#FFD700',
  },
  buttonPremium: {
    backgroundColor: '#7B2FBE',
    borderWidth: 1,
    borderColor: '#9B59B6',
  },
  buttonLeveled: {
    backgroundColor: '#4a9eff',
  },
  buttonUnique: {
    backgroundColor: '#2ae8c8',
  },
  buttonTicket: {
    backgroundColor: '#e05353',
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
  buttonTextCta: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  buttonTextPrimary: {
    color: '#0a0a1a',
  },
  buttonTextPremium: {
    color: '#fff',
  },
  buttonTextLeveled: {
    color: '#0a1628',
  },
  buttonTextUnique: {
    color: '#041310',
  },
  buttonTextTicket: {
    color: '#fff',
  },
  buttonTextCancel: {
    color: '#aaa',
  },
  buttonTextDestructive: {
    color: '#ff6666',
  },
});
