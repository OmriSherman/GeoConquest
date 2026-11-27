import React, { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Easing } from 'react-native-reanimated';
import WorldMapView from './WorldMapView';
import { Country, cca2ToFlagEmoji } from '../types';
import { getCca3ToCca2Map } from '../lib/countryData';
import { t } from '../lib/i18n';

// Slower, eased zoom from the world view into the country (plus a short delay so the
// modal's slide-in finishes first), and the map stays draggable / pinch-zoomable.
const LEARN_ZOOM_MS = 1600;
const LEARN_ZOOM_DELAY_MS = 300;
const LEARN_ZOOM_EASING = Easing.inOut(Easing.cubic);

interface Props {
  country: Country | null;
  visible: boolean;
  onClose: () => void;
}

// Shared "Learn" card for the quizzes: zoomed map + facts + neighbours.
export default function CountryLearnModal({ country, visible, onClose }: Props) {
  const [flagError, setFlagError] = useState(false);
  useEffect(() => setFlagError(false), [country?.cca2]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Gesture handlers need their own root inside an RN Modal (Android), for the pan/pinch map */}
      <GestureHandlerRootView style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {country && (
            <>
              <View style={styles.modalHeader}>
                {country.flagUrl && !flagError ? (
                  <Image source={{ uri: country.flagUrl }} style={styles.modalFlag} resizeMode="contain" onError={() => setFlagError(true)} />
                ) : (
                  <Text style={{ fontSize: 48 }}>{cca2ToFlagEmoji(country.cca2)}</Text>
                )}
                <Text style={styles.modalTitle}>{country.name}</Text>
              </View>

              <WorldMapView
                ownedCountries={[country.cca2]}
                focusCountry={country.cca2}
                height={180}
                showNames={false}
                focusDurationMs={LEARN_ZOOM_MS}
                focusDelayMs={LEARN_ZOOM_DELAY_MS}
                focusEasing={LEARN_ZOOM_EASING}
                interactiveWhenFocused
              />

              <View style={styles.factsGrid}>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>{t('infoModal.capital')}</Text>
                  <Text style={styles.factValue}>{country.capital || t('infoModal.na')}</Text>
                </View>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>{t('infoModal.region')}</Text>
                  <Text style={styles.factValue}>{country.region}</Text>
                </View>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>{t('infoModal.population')}</Text>
                  <Text style={styles.factValue}>{country.population.toLocaleString()}</Text>
                </View>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>{t('infoModal.area')}</Text>
                  <Text style={styles.factValue}>{country.area.toLocaleString()} km²</Text>
                </View>
              </View>

              <View style={styles.neighborsSection}>
                <Text style={styles.factLabel}>{t('infoModal.neighbors')}</Text>
                {country.borders.length > 0 ? (
                  <View style={styles.neighborsRow}>
                    {country.borders.map((cca3Code) => {
                      const cca2 = getCca3ToCca2Map()[cca3Code] || '';
                      return (
                        <Text key={cca3Code} style={styles.neighborFlag}>
                          {cca2 ? cca2ToFlagEmoji(cca2) : '🏳️'}
                        </Text>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.factValue}>{t('infoModal.islandNation')}</Text>
                )}
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>{t('infoModal.gotIt')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, gap: 14, borderWidth: 1, borderColor: '#2a2a4e' },
  modalHeader: { alignItems: 'center', gap: 8 },
  modalFlag: { width: 72, height: 48, borderRadius: 6 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factItem: { width: '47%', backgroundColor: '#0a0a1a', borderRadius: 10, padding: 12, gap: 4 },
  factLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase' },
  factValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  neighborsSection: { backgroundColor: '#0a0a1a', borderRadius: 10, padding: 12, gap: 6 },
  neighborsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  neighborFlag: { fontSize: 24 },
  closeButton: { backgroundColor: '#FFD700', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  closeButtonText: { color: '#0a0a1a', fontWeight: 'bold', fontSize: 16 },
});
