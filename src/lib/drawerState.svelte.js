export const drawerState = $state({ open: false, task: null });

export function openDrawer(task) {
  drawerState.task = { ...task };
  drawerState.open = true;
}

export function closeDrawer() {
  drawerState.open  = false;
  drawerState.task  = null;
}
