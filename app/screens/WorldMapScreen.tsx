import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Country, getCountryPrice } from '../types';
import { fetchCountries } from '../lib/countryData';
import { t } from '../lib/i18n';
import { useGame } from '../context/GameContext';
import CountryTile from '../components/CountryTile';
import GoldDisplay from '../components/GoldDisplay';

export default function WorldMapScreen() {
  const { isOwned, canAfford, purchaseCountry, goldBalance } = useGame();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCountryPress(country: Country) {
    const price = getCountryPrice(country.area);

    if (isOwned(country.cca2)) {
      Alert.alert(country.name, t('worldMap.alreadyOwned'));
      return;
    }
    if (!canAfford(price)) {
      Alert.alert(
        t('worldMap.notEnoughGold'),
        t('worldMap.notEnoughGoldBody', { cost: price, country: country.name }),
      );
      return;
    }

    Alert.alert(
      t('worldMap.purchaseTitle', { country: country.name }),
      t('worldMap.purchaseBody', { country: country.name, cost: price }),
      [
        { text: t('worldMap.cancel'), style: 'cancel' },
        {
          text: t('worldMap.confirm'),
          onPress: async () => {
            try {
              await purchaseCountry(country);
              Alert.alert(t('worldMap.successTitle'), t('worldMap.success', { country: country.name }));
            } catch (err: any) {
              Alert.alert(t('worldMap.error'), err.message ?? 'Purchase failed');
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>{t('worldMap.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('worldMap.title')}</Text>
          <Text style={styles.subtitle}>{t('worldMap.subtitle', { n: countries.length })}</Text>
        </View>
        <GoldDisplay />
      </View>

      <FlatList
        data={countries}
        numColumns={2}
        keyExtractor={(item) => item.cca2}
        renderItem={({ item }) => {
          const price = getCountryPrice(item.area);
          return (
            <CountryTile
              country={item}
              owned={isOwned(item.cca2)}
              canAfford={canAfford(price)}
              onPress={() => handleCountryPress(item)}
            />
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#aaa', fontSize: 16 },
  errorText: { color: '#f44336', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 56,
  },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: '#aaa', fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: 10, paddingBottom: 20 },
});
