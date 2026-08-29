import { useQuery } from '@tanstack/react-query'
import { Button } from '@astryxdesign/core/Button'
import {
  HStack,
  Layout,
  LayoutContent,
  Section,
  VStack,
} from '@astryxdesign/core/Layout'
import { StatusDot } from '@astryxdesign/core/StatusDot'
import { Heading, Text } from '@astryxdesign/core/Text'
import { Link, Route, Routes } from 'react-router-dom'

type HealthResponse = {
  status: string
  timestamp: string
}

async function getHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health')

  if (!response.ok) {
    throw new Error('Backend is unavailable')
  }

  return response.json() as Promise<HealthResponse>
}

function Home() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  })

  const healthLabel = health.isPending
    ? 'Backend に接続中…'
    : health.isError
      ? 'Backend に接続できません'
      : `Backend: ${health.data.status}`

  return (
    <Layout
      height="auto"
      contentWidth={640}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={6}>
            <VStack gap={2}>
              <Text type="supporting" weight="bold">
                BUN MONOREPO
              </Text>
              <Heading level={1}>Menu</Heading>
              <Text>
                React Router、TanStack Query、Hono、Astryx
                の準備ができました。
              </Text>
            </VStack>

            <Section variant="muted" padding={4} aria-live="polite">
              <HStack gap={2} vAlign="center">
                <StatusDot
                  variant={
                    health.isSuccess
                      ? 'success'
                      : health.isError
                        ? 'error'
                        : 'neutral'
                  }
                  label={healthLabel}
                  isPulsing={health.isPending}
                />
                <Text type="supporting">{healthLabel}</Text>
              </HStack>
            </Section>

            <HStack gap={3} vAlign="center" wrap="wrap">
              <Link to="/about">構成を見る →</Link>
              <Button
                label="APIを再確認"
                variant="secondary"
                onClick={() => void health.refetch()}
              />
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  )
}

function About() {
  return (
    <Layout
      height="auto"
      contentWidth={640}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={6}>
            <VStack gap={2}>
              <Text type="supporting" weight="bold">
                STACK
              </Text>
              <Heading level={1}>About</Heading>
            </VStack>

            <Section variant="muted" padding={4}>
              <VStack gap={2}>
                <Text>Vite + React</Text>
                <Text>React Router</Text>
                <Text>TanStack Query</Text>
                <Text>Hono</Text>
                <Text>Astryx</Text>
              </VStack>
            </Section>

            <Link to="/">← ホームへ</Link>
          </VStack>
        </LayoutContent>
      }
    />
  )
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  )
}
