import {
  AdminThemeProvider,
  AdminThemedRoot,
  useAdminTheme,
} from "@dyrected/react";

function ThemeSwitcher() {
  const { theme, setTheme } = useAdminTheme();

  return (
    <select
      value={theme}
      onChange={(event) => setTheme(event.target.value as "system" | "light" | "dark")}
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}

export default function DashboardRoute() {
  return (
    <AdminThemeProvider>
      <AdminThemedRoot>
        <header>
          <ThemeSwitcher />
        </header>

        <main>{/* page content */}</main>
      </AdminThemedRoot>
    </AdminThemeProvider>
  );
}
