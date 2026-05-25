import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onStay: () => void;
  onQuit: () => void;
};

export default function QuitConfirmModal({
  visible,
  title = 'Leave Quiz?',
  message = 'Your progress will be lost.',
  onStay,
  onQuit,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onStay}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Image
            source={require('../../assets/avatars/shocked_hamster.png')}
            style={styles.avatar}
            resizeMode="contain"
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.stayBtn} onPress={onStay} activeOpacity={0.85}>
            <Text style={styles.stayBtnText}>Stay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quitBtn} onPress={onQuit} activeOpacity={0.7}>
            <Text style={styles.quitBtnText}>Quit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#0e0e1f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  avatar: {
    width: 64,
    height: 64,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 10,
  },
  stayBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  stayBtnText: {
    color: '#0a0a1a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quitBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  quitBtnText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
  },
});
