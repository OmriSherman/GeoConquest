import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Country, getCountryPrice } from '../types';
import GoldCoinIcon from './GoldCoinIcon';

interface Props {
  country: Country;
  owned: boolean;
  canAfford: boolean;
  onPress: () => void;
}

export default function CountryTile({ country, owned, canAfford, onPress }: Props) {
  const price = getCountryPrice(country.area);

  return (
    <TouchableOpacity
      style={[styles.tile, owned && styles.ownedTile]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: country.flagUrl }}
        style={[styles.flag, !owned && styles.flagGrayscale]}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {country.name}
        </Text>
        {owned ? (
          <Text style={styles.ownedLabel}>Owned ✓</Text>
        ) : (
          <View style={styles.priceRow}>
            <GoldCoinIcon size={12} style={{ opacity: canAfford ? 1 : 0.5 }} />
            <Text style={[styles.priceText, !canAfford && styles.priceCantAfford]}>{price}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    overflow: 'hidden',
  },
  ownedTile: {
    borderColor: '#FFD700',
  },
  flag: {
    width: '100%',
    height: 70,
  },
  flagGrayscale: {
    opacity: 0.4,
  },
  info: { padding: 8 },
  name: { color: '#fff', fontSize: 12, fontWeight: '600' },
  ownedLabel: { color: '#4CAF50', fontSize: 11, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  priceText: { color: '#FFD700', fontSize: 11 },
  priceCantAfford: { color: '#555' },
});
