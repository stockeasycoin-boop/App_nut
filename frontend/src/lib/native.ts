/** Android-only behaviour (no-ops in the browser). */
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { App } from '@capacitor/app'

export const isNative = Capacitor.isNativePlatform()

/** Hardware back: let the app close what's open first; exit from the home tab. */
export function onBackButton(handle: () => boolean) {
  if (!isNative) return () => {}
  const sub = App.addListener('backButton', () => {
    if (!handle()) App.exitApp()
  })
  return () => {
    sub.then((s) => s.remove())
  }
}

/** Status/navigation bar icons: dark on light screens, light on dark ones. */
export function setSystemBars(dark: boolean) {
  if (!isNative) return
  SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {})
}
