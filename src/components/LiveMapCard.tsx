import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MapPin, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react-native';
import { SafeZone } from '../services/familyService';

interface LiveMapCardProps {
  childName: string;
  location: { lat: number; lng: number; updatedAt?: number } | null;
  safeZones: SafeZone[];
  geofenceAlert: string | null;
  onSaveZone: (zone: SafeZone) => void;
}

export default function LiveMapCard({
  childName,
  location,
  safeZones,
  geofenceAlert,
  onSaveZone,
}: LiveMapCardProps) {
  const openExternalMap = () => {
    if (!location) return;
    const url = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`;
    Linking.openURL(url);
  };

  const defineCurrentAsZone = (id: string, name: string) => {
    if (!location) return;
    onSaveZone({
      id,
      name,
      lat: location.lat,
      lng: location.lng,
      radiusMeters: 250,
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MapPin color="#101D38" size={20} />
          <Text style={styles.cardTitle}>Mapa ao Vivo & Cercas Virtuais</Text>
        </View>
        {location && (
          <TouchableOpacity onPress={openExternalMap} style={styles.extBtn}>
            <ExternalLink color="#101D38" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {geofenceAlert && (
        <View style={styles.alertBanner}>
          <AlertTriangle color="#B91C1C" size={18} />
          <Text style={styles.alertText}>{childName}: {geofenceAlert}</Text>
        </View>
      )}

      {!location ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Aguardando sinal GPS do aparelho de {childName}...
          </Text>
        </View>
      ) : (
        <>
          {Platform.OS === 'web' ? (
            <View style={styles.mapFrameWrap}>
              <iframe
                title="Mapa Family Guard"
                width="100%"
                height="220"
                style={{ border: 0, borderRadius: 12 }}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.006}%2C${location.lat - 0.004}%2C${location.lng + 0.006}%2C${location.lat + 0.004}&layer=mapnik&marker=${location.lat}%2C${location.lng}`}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.mobileMapBox} onPress={openExternalMap}>
              <MapPin color="#D6AD53" size={28} />
              <Text style={styles.mobileMapTitle}>Abrir Posição no Mapa</Text>
              <Text style={styles.coordsText}>
                Lat: {location.lat.toFixed(5)} | Lng: {location.lng.toFixed(5)}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.zoneSectionLabel}>Zonas Seguras (Raio de 250m):</Text>
          <View style={styles.zoneButtonsRow}>
            <TouchableOpacity
              style={styles.zoneBtn}
              onPress={() => defineCurrentAsZone('home', 'Casa')}
            >
              <ShieldCheck color="#D6AD53" size={16} />
              <Text style={styles.zoneBtnText}>
                {safeZones.some((z) => z.id === 'home') ? 'Atualizar Casa' : 'Marcar Casa Aqui'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zoneBtn}
              onPress={() => defineCurrentAsZone('school', 'Escola')}
            >
              <ShieldCheck color="#D6AD53" size={16} />
              <Text style={styles.zoneBtnText}>
                {safeZones.some((z) => z.id === 'school') ? 'Atualizar Escola' : 'Marcar Escola Aqui'}
              </Text>
            </TouchableOpacity>
          </View>

          {safeZones.length > 0 && (
            <Text style={styles.activeZonesInfo}>
              Cercas ativas: {safeZones.map((z) => z.name).join(' • ')}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#101D38' },
  extBtn: { padding: 6, backgroundColor: '#F1F5F9', borderRadius: 8 },
  alertBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F87171',
  },
  alertText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', flex: 1 },
  placeholder: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, alignItems: 'center' },
  placeholderText: { color: '#64748B', fontSize: 13 },
  mapFrameWrap: { borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  mobileMapBox: {
    backgroundColor: '#101D38', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12,
  },
  mobileMapTitle: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginTop: 6 },
  coordsText: { color: '#A3B1CC', fontSize: 12, marginTop: 4 },
  zoneSectionLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  zoneButtonsRow: { flexDirection: 'row', gap: 10 },
  zoneBtn: {
    flex: 1, backgroundColor: '#101D38', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  zoneBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  activeZonesInfo: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 8 },
});