import React, { useEffect, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { STORE_URL, STORE_NAME } from '../lib/storeLinks';
import { t } from '../lib/i18n';

function semverGte(a: string, b: string) {
  const parse = (v: string) => v.split('.').map(Number);
  const [a1, a2, a3] = parse(a);
  const [b1, b2, b3] = parse(b);
  if (a1 !== b1) return a1 > b1;
  if (a2 !== b2) return a2 > b2;
  return a3 >= b3;
}

export default function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_version')
        .single();
      if (!data) return;
      const current = Constants.expoConfig?.version ?? '0.0.0';
      if (!semverGte(current, data.value)) setBlocked(true);
    })();
  }, []);

  return (
    <>
      {children}
      <Modal visible={blocked} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.box}>
            <Text style={styles.title}>{t('forceUpdate.title')}</Text>
            <Text style={styles.body}>
              {t('forceUpdate.body')}
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(STORE_URL)}>
              <Text style={styles.btnText}>{t('forceUpdate.button', { store: STORE_NAME })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  box: {
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
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  body: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 10 },
  btn: { backgroundColor: '#FFD700', borderRadius: 14, paddingVertical: 14, alignItems: 'center', width: '100%' },
  btnText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
});
