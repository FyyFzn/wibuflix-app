import { StyleSheet } from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from './theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: 'rgba(230,57,70,0.35)', borderRadius: BorderRadius.md },
  backText: { color: Colors.accent, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  title: { flex: 1, fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  
  playerWrapper: { width: '100%', backgroundColor: Colors.black, position: 'relative' },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10, gap: Spacing.md },
  overlayText: { color: Colors.textMuted, fontSize: FontSize.md },
  video: { width: '100%', height: '100%' },
  webview: { width: '100%', height: '100%', backgroundColor: Colors.black },
  playerError: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerErrorText: { color: Colors.accent, fontSize: FontSize.base, textAlign: 'center', paddingHorizontal: Spacing.xxl },

  // Custom Controls UI
  touchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 },
  controlsUI: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'space-between' },
  
  // Skip Indicator
  skipIndicator: { position: 'absolute', top: 0, bottom: 0, width: '40%', justifyContent: 'center', zIndex: 15 },
  skipLeft: { left: 0, alignItems: 'center' },
  skipRight: { right: 0, alignItems: 'center' },
  skipBubble: { backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl, borderRadius: BorderRadius.full, alignItems: 'center', gap: Spacing.xs },
  skipText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  skipOpBtn: { position: 'absolute', bottom: 80, right: Spacing.xl, backgroundColor: 'rgba(230,57,70,0.85)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 100 },
  skipEdBtn: { position: 'absolute', bottom: 80, right: Spacing.xl, backgroundColor: 'rgba(230,57,70,0.85)', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', zIndex: 100 },
  skipOpText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },

  // Utility Styles (formerly inline)
  flex1: { flex: 1 },
  ml0: { marginLeft: 0 },
  ml4: { marginLeft: 4 },
  opacity30: { opacity: 0.3 },

  topBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  topBarTitle: { color: Colors.white, fontSize: FontSize.md, fontWeight: FontWeight.bold, flex: 1 },
  topRightActions: { flexDirection: 'row', gap: Spacing.sm },
  ctrlBtn: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  ctrlBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  
  wvCtrlBtn: { alignItems: 'center', gap: 4 },
  wvCtrlIcon: { color: Colors.white, fontSize: 32 },
  wvCtrlText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  
  wvPermExitBtn: { position: 'absolute', top: Spacing.xl, left: Spacing.xl, padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', zIndex: 999 },
  wvPermExitText: { color: Colors.white, fontSize: FontSize.lg, fontWeight: 'bold' },
  wvTouchOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  wvBackBtn: { position: 'absolute', top: Spacing.xl, left: Spacing.xl, padding: Spacing.sm, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  wvBackText: { color: Colors.white, fontSize: FontSize.md, fontWeight: 'bold' },
  wvControlsGroup: { flexDirection: 'row', gap: 30, alignItems: 'center' },

  centerControls: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playPauseBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  playPauseIcon: { color: Colors.white, fontSize: 32, marginLeft: 4 }, // marginLeft slightly for optical center of play icon

  bottomBar: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: 'rgba(0,0,0,0.6)' },
  timeText: { color: Colors.white, fontSize: FontSize.xs, fontWeight: FontWeight.medium, width: 45, textAlign: 'center' },
  slider: { flex: 1, marginHorizontal: Spacing.sm, height: 40 },
  bottomRightGroup: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  smallNavBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  smallNavIcon: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold },

  controlsContainer: { flex: 1 },
  controlsContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.xxl },
  navBtn: { flex: 1, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  navBtnTextDisabled: { color: Colors.textMuted },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: Colors.surface, width: '70%', maxHeight: '80%', borderRadius: BorderRadius.lg, overflow: 'hidden', paddingVertical: Spacing.md },
  modalTitle: { color: Colors.white, fontSize: FontSize.lg, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItem: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border2 },
  modalItemActive: { backgroundColor: 'rgba(230,57,70,0.15)' },
  modalItemText: { color: Colors.text, fontSize: FontSize.md },
  modalItemTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },
  modalCloseBtn: { padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.surface2, marginTop: Spacing.sm },
  modalCloseText: { color: Colors.accent, fontWeight: FontWeight.bold, fontSize: FontSize.md }
});
