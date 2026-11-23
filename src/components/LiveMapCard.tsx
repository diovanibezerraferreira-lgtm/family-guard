import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { MapPin, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react-native';
import { SafeZone } from '../services/familyService';

interface LiveMapCardProps {
  childName: string;
  location: { lat: number; lng: number; accuracy?: number; updatedAt?: number } | null;
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
  const openGoogleMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
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

  const formattedTime = location?.updatedAt
    ? new Date(location.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MapPin color="#101D38" size={20} />
          <View>
            <Text style={styles.cardTitle}>Mapa ao Vivo & Cercas Virtuais</Text>
            {location && (
              <Text style={styles.subMeta}>
                Atualizado às {formattedTime} {location.accuracy ? `• Precisão ~${location.accuracy}m` : ''}
              </Text>
            )}
          </View>
        </View>
        {location && (
          <TouchableOpacity onPress={openGoogleMaps} style={styles.extBtn}>
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
            Aguardando sinal GPS de alta precisão do aparelho de {childName}...
          </Text>
        </View>
      ) : (
        <>
          {Platform.OS === 'web' ? (
            <View style={styles.mapFrameWrap}>
              <iframe
                title="Mapa Google Family Guard"
                width="100%"
                height="240"
                style={{ border: 0, borderRadius: 12 }}
                loading="lazy"
                src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=17&output=embed`}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.mobileMapBox} onPress={openGoogleMaps}>
              <MapPin color="#D6AD53" size={28} />
              <Text style={styles.mobileMapTitle}>Abrir Posição Exata no Google Maps</Text>
              <Text style={styles.coordsText}>
                Lat: {location.lat.toFixed(6)} | Lng: {location.lng.toFixed(6)}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#101D38' },
  subMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  extBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 8 },
  alertBanner: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 10, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F87171',
  },
  alertText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', flex: 1 },
  placeholder: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 12, alignItems: 'center' },
  placeholderText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
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