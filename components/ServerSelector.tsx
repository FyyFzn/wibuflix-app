/**
 * ServerSelector — Simplified to only show Host names (Wibufile, Pucuk, dll).
 */

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../styles/theme';
import { ServerItem } from '../services/api';
import { getHostName } from '../utils/hostUtils';

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
  
  const sources = useMemo(() => {
    const list = [...new Set(servers.map(s => s.source || 'Samehadaku'))];
    return list;
  }, [servers]);

  const [activeTab, setActiveTab] = React.useState<string>(sources.includes('Samehadaku') ? 'Samehadaku' : sources[0]);

  // Sync tab if sources change and current tab is no longer valid
  React.useEffect(() => {
    if (!sources.includes(activeTab) && sources.length > 0) {
      setActiveTab(sources.includes('Samehadaku') ? 'Samehadaku' : sources[0]);
    }
  }, [sources, activeTab]);

  const filteredServers = useMemo(() => {
    return servers.filter(s => (s.source || 'Samehadaku') === activeTab);
  }, [servers, activeTab]);

  const groups = useMemo(() => {
    const groupsMap: Record<string, ServerGroup> = {};

    filteredServers.forEach((srv) => {
      const key = getHostName(srv);

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
  }, [filteredServers]);

  return (
    <View style={styles.container}>
      {sources.length > 1 && (
        <View style={styles.tabsContainer}>
          {sources.map(src => {
            const isActive = src === activeTab;
            return (
              <TouchableOpacity
                key={src}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(src)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {src}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {groups.map((group) => {
        // Kelompokkan berdasarkan format (MKV, MP4, x265)
        const formatGroups: Record<string, ServerItem[]> = {};
        const seenRes = new Set<string>(); // Failsafe deduplication per group
        group.items.forEach(srv => {
          const rawName = srv.nama.replace(/\s+/g, ' ').trim();
          const dedupKey = rawName.toLowerCase();
          if (seenRes.has(dedupKey)) return;
          seenRes.add(dedupKey);

          const upperName = rawName.toUpperCase();
          let format = 'Lainnya';
          if (upperName.includes('MKV')) format = 'MKV';
          else if (upperName.includes('MP4') && !upperName.includes('MP4HD')) format = 'MP4';
          else if (upperName.includes('MP4HD')) format = 'MP4'; // gabungkan MP4HD ke MP4
          else if (upperName.includes('X265') || upperName.includes('HEVC')) format = 'x265';
          else if (upperName.includes('4K') || upperName.includes('1080P') || upperName.includes('720P')) format = 'MP4'; // Fallback to MP4 for typical resolutions that miss the format text
          
          if (!formatGroups[format]) formatGroups[format] = [];
          formatGroups[format].push(srv);
        });
        
        const formatKeys = ['MKV', 'MP4', 'x265', 'Lainnya'].filter(k => formatGroups[k] && formatGroups[k].length > 0);

        return (
          <View key={group.hostName} style={styles.serverGroup}>
            <Text style={styles.serverGroupLabel}>{group.label}</Text>
            
            {formatKeys.map((fmt, fIdx) => (
              <View key={fmt} style={[styles.formatBlock, fIdx > 0 && { marginTop: Spacing.md }]}>
                <Text style={styles.formatLabel}>{fmt}</Text>
                <View style={styles.resolutionsWrap}>
                  {formatGroups[fmt].map((srv, i) => {
                    // Buang nama format dari tombol agar lebih bersih (contoh: "1080p MKV" jadi "1080p")
                    let resName = srv.nama.split('·')[0]?.trim() || srv.nama;
                    if (fmt !== 'Lainnya') {
                      // Hapus string format (case-insensitive)
                      const regex = new RegExp(fmt, 'i');
                      resName = resName.replace(regex, '').trim();
                    }
                    
                    const isResActive = activeServerName === srv.nama && activeHost === group.hostName;
                    
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.resBtn, isResActive && styles.resBtnActive, disabled && { opacity: 0.5 }]}
                        onPress={() => {
                          if (!isResActive) {
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
            ))}
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
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Spacing.md,
  },
  tabBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: Colors.accentDim,
  },
  tabText: {
    color: Colors.textDim,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  tabTextActive: {
    color: Colors.accent,
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
  formatBlock: {
    marginTop: Spacing.xs,
  },
  formatLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
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
