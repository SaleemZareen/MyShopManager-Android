# Developer and AI Coding Agent Rules

This project is structured specifically to behave like a native mobile app wrapped in an Android WebView. Please adhere strictly to the following architectural, layout, and UX rules.

## 1. Global Status Bar Consistency & Safe Areas

### The Rule
- **The Android system status bar must remain visible on every single normal screen, overlay, and modal.**
- **No application content (text, icons, buttons) must render behind or underneath the status bar.**
- **Do not use hardcoded pixel values (like `24px` or `pt-6`) for status bar offsets.** These are fragile and fail on devices with different status bar heights, notches, or pinholes.

### Implementation Guide
1. **Normal Screens**: Are rendered inside the main container beneath the sticky `<Header>` element. The `<Header>` handles safe area padding at the top:
   ```tsx
   pt-[env(safe-area-inset-top,0px)]
   ```
2. **Full-Screen Modals & Overlays**: Must use the CSS Safe Area Inset API at their root container or their headers.
   - For full-screen overlay headers (like App Bars):
     ```tsx
     pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]
     ```
   - For full-screen modal overlays wrapping content:
     ```tsx
     pt-[env(safe-area-inset-top,0px)]
     ```
3. **Height Constraints**: If you calculate heights, subtract the safe area dynamically:
   ```css
   h-[calc(100dvh-env(safe-area-inset-top,0px))]
   ```

---

## 2. Centralized Back Navigation

- **Every state change** (new sub-view, modal, tab, slide-over panel, or dialog) must push its closure handler onto the centralized navigation history stack.
- The user must be able to go back correctly using:
  - An in-app Back button or Arrow icon.
  - The Android native system Back button / swipe gesture.
  - Keyboard/browser back keys.
