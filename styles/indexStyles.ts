import { StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from './theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(9, 11, 16, 0.95)',
  },
  logoText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text,
    letterSpacing: 4,
  },
  logoAccent: {
    color: Colors.accent,
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIcon: {
    fontSize: 18,
  },
  headerLine: {
    height: 1,
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },
  searchWrapper: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  catalogHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 3,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  row: {
    gap: Spacing.md,
  },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
  },
  errorText: {
    color: Colors.accent,
    fontSize: FontSize.base,
    marginBottom: Spacing.lg,
  },
  retryBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
  },
  navBtn: {
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  navBtnTextDisabled: {
    color: Colors.textMuted,
  },
  pageInfo: {
    color: Colors.textMuted,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  horizontalSection: {
    marginTop: Spacing.md,
  },
  horizontalList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  historyCard: {
    width: 140,
    marginRight: Spacing.sm,
  },
  historyThumbContainer: {
    position: 'relative',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  historyOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  historyEpText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: 'bold',
  },
  historyTitle: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: 'bold',
    marginTop: Spacing.xs,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  tabBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(229, 9, 20, 0.1)',
    borderColor: Colors.accent,
  },
  tabBtnText: {
    color: Colors.textMuted,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.sm,
  },
  tabBtnTextActive: {
    color: Colors.accent,
  },
});
