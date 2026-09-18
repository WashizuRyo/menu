import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/meal-plans')({
  component: Outlet,
})
