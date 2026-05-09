# Spec: User UI Preferences Persistence

## Objective
Provide a personalized and consistent user experience by remembering UI states (sidebar state, theme, table density) across sessions and devices within a workspace.

## Key Preferences to Store
- **Theme**: Light, Dark, or System.
- **Sidebar State**: Expanded or Collapsed.
- **Table Density**: Compact, Standard, or Spacious.
- **Last Active Site**: If the workspace has multiple sites, remember the one last visited.
- **Dashboard Widgets**: User-customized layout and visibility of dashboard cards.

## Persistence Strategy

### 1. Client-Side (Immediate)
- Use `localStorage` for instant application of settings during the boot sequence to prevent "flashing" (e.g., dark mode flash).

### 2. Backend Synchronization (Persistent)
- Store a `preferences` JSON object in the User model in the database.
- Debounce updates to the server to avoid excessive API calls.
- Sync on login and periodically if settings change.

## Architecture

### `useUserPreferences` Hook
- A centralized hook to manage and provide preferences throughout the application.
- Example API:
  ```typescript
  const { theme, setTheme, sidebarCollapsed, toggleSidebar } = useUserPreferences();
  ```

### API Endpoint
- `PATCH /api/user/preferences`: Updates specific keys or the whole preference object.
- `GET /api/user/preferences`: Retrieves the current state (usually bundled with the initial user session data).

## UI Requirements
- A "Settings" or "Appearance" section in the user profile to manually toggle these options.
- Visual confirmation when settings are saved.
