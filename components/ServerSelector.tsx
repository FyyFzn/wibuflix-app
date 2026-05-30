/**
 * ServerSelector — Simplified to only show Host names (Wibufile, Pucuk, dll).
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';
import { ServerItem } from '../services/api';

interface ServerGroup {
  hostName: string;
  label: string;
  items: ServerItem[];
}

interface ServerSelectorProps {
  servers: ServerItem[];
  activeHost: string;
  activeServerName: string;
  onSelectHost: (hostName: string, items: ServerItem[]) => void;
  onSelectResolution: (srv: ServerItem) => void;
  disabled?: boolean;
}

export default function ServerSelector({
  servers,
  activeHost,
  activeServerName,
  onSelectHost,
  onSelectResolution,
  disabled = false,
}: ServerSelectorProps) {
  
  const groups = useMemo(() => {
    const groupsMap: Record<string, ServerGroup> = {};

    servers.forEach((srv, i) => {
      let key: string;
      if (srv.namaHost) {
        key = srv.namaHost.toLowerCase();
      } else {
        const nama = srv.nama || '';
        const parts = nama.split('·');
        let candidate = parts[parts.length - 1].trim().split(' ')[0].toLowerCase();
        
        if (candidate.includes('vidlion')) candidate = 'vidhide';
        else if (candidate.includes('bili') || candidate.includes('bstation')) candidate = 'bilibili';
        else if (candidate.includes('gdrive') || candidate.includes('google')) candidate = 'gdrive';
        else if (candidate.includes('kraken')) candidate = 'krakenfiles';
        else if (candidate.includes('wibu')) candidate = 'wibufile';

        if (!candidate || candidate === 'server' || candidate === 'unknown') {
          candidate = 'alternatif';
        }
        key = candidate;
      }

      if (!groupsMap[key]) {
        groupsMap[key] = {
          hostName: key,
          label: key === 'alternatif' ? 'Alternatif' : (srv.namaHost || key.charAt(0).toUpperCase() + key.slice(1)),
          items: [],
        };
      }
      groupsMap[key].items.push(srv);
    });

    return Object.values(groupsMap);
  }, [servers]);

  return (
    <View style={styles.container}>
      {groups.map((group) => {
        return (
          <View key={group.hostName} style={styles.serverGroup}>
            <Text style={styles.serverGroupLabel}>{group.label}</Text>
            
            <View style={styles.resolutionsWrap}>
              {group.items.map((srv, i) => {
                const resName = srv.nama.split('·')[0]?.trim() || srv.nama;
                const isResActive = activeServerName === srv.nama;
                
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.resBtn, isResActive && styles.resBtnActive, disabled && { opacity: 0.5 }]}
                    onPress={() => {
                      if (!isResActive) {
                        onSelectHost(group.hostName, group.items);
                        onSelectResolution(srv);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={disabled}
                  >
                    <Text style={[styles.resBtnText, isResActive && styles.resBtnTextActive]}>
                      {resName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  serverGroup: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  serverGroupLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.xs,
  },
  resolutionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  resBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  resBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    elevation: 4,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  resBtnText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  resBtnTextActive: {
    color: Colors.white,
  },
});
